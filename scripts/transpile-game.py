#!/usr/bin/env python3
"""Reproducibly translate the complete recovered Monkey game from AS3 to JS.

Input: FFDec export with autoDeobfuscate=true,simplifyExpressions=true.
Only Flash platform code (gxtk, Mochi, Box2D) is excluded: runtime.js and
physics.js implement that boundary. Every bb_* class, method, global and
function is emitted. No SWF interpreter is involved in the generated game.

This deliberately small AS3 parser handles the recovered program, rather than
pretending that deleting type annotations is sufficient. It resolves implicit
instance/static names, preserves int coercion on writes/parameters/returns,
implements as/is, and removes root-class super() calls (implicit AS Object).
Declared String stores/entries/returns use nullable coercion, separately from
ordinary String(x). String assignment expressions retain their raw RHS; +=
keeps the ASC-compatible read/RHS/write-stem order of the recovered domain.
This remains a recovered-program translator, not a general AS3 compiler.
Run: python scripts/transpile-game.py
"""
from __future__ import annotations
import argparse
from dataclasses import dataclass, field
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

@dataclass
class Token:
    value: str
    start: int
    end: int

LEX = re.compile(r'''(?P<space>\s+)|(?P<comment>//[^\n]*|/\*[\s\S]*?\*/)|(?P<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(?P<number>0[xX][\da-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)|(?P<identifier>[A-Za-z_$][\w$]*)|(?P<operator>>>>=|===|!==|>>>|<<=|>>=|\+\+|--|&&|\|\||==|!=|<=|>=|<<|>>|\+=|-=|\*=|/=|%=|&=|\|=|\^=|[^\s])''', re.X)

def tokenize(text):
    result=[]
    for match in LEX.finditer(text):
        if match.lastgroup not in ('space','comment'):
            result.append(Token(match.group(),match.start(),match.end()))
    return result

def matching(tokens, index, opening='{', closing='}'):
    assert tokens[index].value == opening, (index,tokens[index])
    depth=1
    for i in range(index+1,len(tokens)):
        if tokens[i].value==opening: depth+=1
        elif tokens[i].value==closing:
            depth-=1
            if depth==0: return i
    raise ValueError('Unterminated '+opening)

@dataclass
class Field:
    name: str
    type: str
    initializer: list[Token]
    static: bool=False

@dataclass
class Method:
    name: str
    params: list[tuple[str,str]]
    result: str
    body: list[Token]
    static: bool=False

@dataclass
class Class:
    name: str
    parent: str|None
    fields: dict[str,Field]=field(default_factory=dict)
    methods: dict[str,Method]=field(default_factory=dict)

class Reader:
    def __init__(self,tokens): self.tokens=tokens; self.i=0
    def peek(self,offset=0):
        return self.tokens[self.i+offset].value if self.i+offset<len(self.tokens) else '<eof>'
    def take(self,value=None):
        token=self.tokens[self.i]; self.i+=1
        if value is not None and token.value!=value:
            raise ValueError(f'Expected {value!r}, got {token.value!r} at token {self.i}: '+self.context())
        return token.value
    def context(self): return ' '.join(t.value for t in self.tokens[max(0,self.i-5):self.i+8])
    def until(self,value):
        start=self.i
        while self.peek()!=value and self.peek()!='<eof>': self.i+=1
        return self.tokens[start:self.i]

def read_method(reader,static=False):
    reader.take('function'); name=reader.take(); reader.take('('); params=[]
    while reader.peek()!=')':
        pn=reader.take(); reader.take(':'); pt=reader.take(); params.append((pn,pt))
        if reader.peek()!=',': break
        reader.take(',')
    reader.take(')'); result='void'
    if reader.peek()==':': reader.take(':'); result=reader.take()
    start=reader.i; end=matching(reader.tokens,start)
    body=reader.tokens[start+1:end]; reader.i=end+1
    return Method(name,params,result,body,static)

def read_field(reader,static=False):
    reader.take('var'); name=reader.take(); reader.take(':'); typ=reader.take(); init=[]
    if reader.peek()=='=':
        reader.take('='); start=reader.i; depth=0
        while not (depth==0 and reader.peek()==';'):
            v=reader.take()
            if v in ('(','[','{'): depth+=1
            elif v in (')',']','}'): depth-=1
        init=reader.tokens[start:reader.i]
    reader.take(';')
    return Field(name,typ,init,static)

def read_class(tokens,index):
    reader=Reader(tokens); reader.i=index; reader.take('class'); name=reader.take(); parent=None
    if reader.peek()=='extends': reader.take(); parent=reader.take()
    reader.take('{'); cls=Class(name,parent)
    while reader.peek()!='}':
        static=False
        while reader.peek() in ('public','private','internal','protected','override','final','static'):
            if reader.take()=='static': static=True
        if reader.peek()=='var':
            f=read_field(reader,static); cls.fields[f.name]=f
        elif reader.peek()=='function':
            m=read_method(reader,static); cls.methods[m.name]=m
        else: raise ValueError('Unknown class member '+reader.context())
    return cls

# The expression parser uses normal JS/AS3 precedence; assignment coercion is
# applied to the complete RHS, not to its first token or only its initializer.
PRECEDENCE={'=':1,'+=':1,'-=':1,'*=':1,'/=':1,'%=':1,'&=':1,'|=':1,'^=':1,'<<=':1,'>>=':1,'>>>=':1,
            '||':3,'&&':4,'|':5,'^':6,'&':7,'==':8,'!=':8,'===':8,'!==':8,
            '<':9,'>':9,'<=':9,'>=':9,'as':9,'is':9,'in':9,'instanceof':9,
            '<<':10,'>>':10,'>>>':10,'+':11,'-':11,'*':12,'/':12,'%':12}

@dataclass
class Expr:
    code: str
    type: str='*'
    classref: str|None=None
    method: str|None=None
    lvalue: bool=False
    receiver: str|None=None
    key: str|None=None
    # Expression/API return inference must never grant a declared String slot.
    store_type: str|None=None
    store_binding: str|None=None
    store_form: str|None=None
    literal_key: str|None=None
    ambiguous_string_reference: bool=False

def default_value(typ):
    return {'int':'0','uint':'0','Number':'NaN','Boolean':'false','String':'null'}.get(typ,'null')

def coerce(code,typ):
    if typ=='int': return f'__as3_int({code})'
    if typ=='uint': return f'__as3_uint({code})'
    if typ=='Number': return f'Number({code})'
    if typ=='Boolean': return f'Boolean({code})'
    if typ=='String': return f'__as3_nullableString({code})'
    return code

class Translator(Reader):
    def __init__(self,tokens,classes,globals_,functions,owner=None,method=None):
        super().__init__(tokens)
        self.classes=classes; self.globals=globals_; self.functions=functions
        self.owner=owner; self.method=method; self.locals={}
        if method:
            self.locals.update(method.params)
            for i,t in enumerate(tokens[:-3]):
                if t.value=='var' and tokens[i+2].value==':':
                    self.locals[tokens[i+1].value]=tokens[i+3].value
        self.calls=set()
        # Hygienic arrow parameters: reserve original identifiers, declarations,
        # and every temporary already emitted by this Translator.
        self.temp_names={t.value for t in tokens}|set(self.locals)|set(classes)|set(globals_)|set(functions)
        self.temp_serial=0

    def fresh_temp(self,role):
        while True:
            name='__as3_string'+role+str(self.temp_serial); self.temp_serial+=1
            if name not in self.temp_names:
                self.temp_names.add(name); return name

    def raw_string_store(self,lvalue,value):
        # Own-AS compiled lowering retains the raw expression value separately
        # from the coerced slot. The value argument is evaluated once.
        saved=self.fresh_temp('Value')
        return '(('+saved+') => ('+lvalue+' = __as3_nullableString('+saved+'), '+saved+'))('+value+')'

    def string_assignment(self,left,right,op):
        if not left.lvalue:
            raise ValueError('Declared String assignment requires an assignable reference')
        if op=='=':
            if left.receiver is None:
                code=self.raw_string_store(left.code,right.code)
            elif left.receiver=='super':
                raise ValueError('String super-reference lowering needs separate compiled evidence')
            else:
                # receiver, literal key, then RHS; store and return raw RHS in
                # the helper. Do not evaluate RHS before an effectful receiver.
                code='__as3_storeString('+left.receiver+', '+left.key+', '+right.code+')'
            return Expr(code,right.type,right.classref,method=right.method)
        if op!='+=':
            raise ValueError('String compound operator outside the recovered += domain: '+op)
        if left.receiver=='super':
            raise ValueError('String super compound lowering needs separate compiled evidence')
        if left.store_form=='index':
            # Royale bracket-compound lowering: cache the plain literal key
            # before first stem; read stem -> RHS/op -> second write stem.
            key=self.fresh_temp('Key')
            target=left.receiver+'['+key+']'
            code='(('+key+') => '+self.raw_string_store(target,'('+target+' + '+right.code+')')+')('+left.key+')'
        else:
            # Do NOT reuse the read receiver: ASC compatibility can evaluate
            # the stem again, but only AFTER the RHS/operation has completed.
            code=self.raw_string_store(left.code,'('+left.code+' + '+right.code+')')
        return Expr(code,'String')

    def lookup(self,name,cls=None):
        cls=cls or self.owner
        while cls:
            c=self.classes.get(cls)
            if not c: return None
            if name in c.fields: return c.fields[name],cls
            if name in c.methods: return c.methods[name],cls
            cls=c.parent
        return None

    def has_string_field(self,cls,static_only=False):
        while cls in self.classes:
            owner=self.classes[cls]
            if any(f.type=='String' and (not static_only or f.static)
                   for f in owner.fields.values()): return True
            cls=owner.parent
        return False

    def resolve(self,name):
        if name in self.locals:
            return Expr(name,self.locals[name],lvalue=True,store_type=self.locals[name],
                        store_binding='local:'+name,store_form='identifier')
        if name=='this': return Expr(name,self.owner or '*')
        if name=='super':
            return Expr(name,self.classes[self.owner].parent or 'Object')
        # An AS3 constructor shares its class name, but a bare class reference
        # (notably `value as OwnClass`) must never resolve to an instance method.
        if name in self.classes: return Expr(name,'Class',classref=name)
        found=self.lookup(name)
        if found:
            member,owner=found
            prefix=owner if member.static else 'this'
            if isinstance(member,Field): return Expr(prefix+'.'+name,member.type,lvalue=True,
                                                    receiver=prefix,key=json.dumps(name),store_type=member.type,
                                                    store_binding='field:'+owner+'.'+name,store_form='member')
            return Expr(prefix+'.'+name,member.result,method=name)
        if name in self.functions: return Expr(name,self.functions[name].result,method=name)
        if name in self.globals:
            return Expr(name,self.globals[name].type,lvalue=True,store_type=self.globals[name].type,
                        store_binding='global:'+name,store_form='identifier')
        if name=='int': return Expr('__as3_int','int',method='int')
        if name=='uint': return Expr('__as3_uint','uint',method='uint')
        if name in ('Number','String','Boolean','Array','Object'):
            return Expr(name,name,method=name)
        return Expr(name)

    def expression(self,minprec=1):
        left=self.prefix()
        while True:
            op=self.peek()
            if op=='?' and minprec<=2:
                self.take(); yes=self.expression(); self.take(':'); no=self.expression(2)
                left=Expr(f'({left.code} ? {yes.code} : {no.code})',yes.type if yes.type==no.type else '*')
                continue
            prec=PRECEDENCE.get(op,0)
            if not prec or prec<minprec: break
            self.take()
            assignment=prec==1
            right=self.expression(prec if assignment else prec+1)
            if op=='as': left=Expr(f'__as3_as({left.code}, {right.code})',right.classref or right.type)
            elif op=='is': left=Expr(f'__as3_is({left.code}, {right.code})','Boolean')
            elif assignment:
                if left.ambiguous_string_reference:
                    raise ValueError('Computed/instance-static String reference outside the proven source domain')
                if left.store_type=='String':
                    left=self.string_assignment(left,right,op)
                    continue
                value=right.code
                if op!='=': value=f'({left.code} {op[:-1]} {right.code})'
                # Preserve non-String legacy lowering. A slice/join return-type
                # heuristic is not a declared String storage boundary.
                store_type=left.type if left.type!='String' else '*'
                left=Expr(f'({left.code} = {coerce(value,store_type)})',left.type)
            else:
                typ='Boolean' if op in ('<','>','<=','>=','==','!=','===','!==','in','instanceof') else 'Number'
                if op=='+' and (left.type=='String' or right.type=='String'): typ='String'
                left=Expr(f'({left.code} {op} {right.code})',typ)
        return left

    def increment(self,operand,op,postfix=False):
        if operand.store_type=='String' or operand.ambiguous_string_reference:
            raise ValueError('String mutation outside recovered source requires separate evidence')
        if not operand.lvalue:
            raise ValueError('Increment requires an assignable operand: '+operand.code)
        if operand.type not in ('int','uint'):
            return Expr('('+operand.code+op+')' if postfix else '('+op+' '+operand.code+')',operand.type)
        delta='1' if op=='++' else '-1'
        conversion='__as3_int' if operand.type=='int' else '__as3_uint'
        if operand.receiver is not None:
            # Preserve one evaluation of both receiver and key. In particular,
            # obj().field++ must not call obj() twice while coercing the store.
            return Expr('__as3_updateSlot('+operand.receiver+', '+operand.key+', '+delta+', '+
                        ('true' if postfix else 'false')+', '+
                        ('true' if operand.type=='uint' else 'false')+')',operand.type if postfix else 'Number')
        # Typed locals/globals are identifiers, not effectful member lookups.
        if not re.fullmatch(r'[A-Za-z_$][\w$]*',operand.code.strip('()')):
            raise ValueError('Unrepresented typed increment reference: '+operand.code)
        if postfix or operand.type=='uint':
            return Expr('((__as3_previous) => ('+operand.code+' = '+conversion+
                        '(__as3_previous + '+delta+'), '+
                        ('__as3_previous' if postfix else '__as3_previous + '+delta)+
                        '))('+operand.code+')',operand.type if postfix else 'Number')
        return Expr('('+operand.code+' = '+conversion+'('+operand.code+' + '+delta+'))',operand.type)

    def prefix(self):
        v=self.peek()
        if v in ('!','~','+','-','typeof','void','delete','++','--'):
            self.take(); operand=self.prefix()
            if v in ('++','--'): return self.increment(operand,v)
            result=Expr(f'({v} {operand.code})', 'Boolean' if v=='!' else operand.type)
            return result
        if v=='new':
            self.take(); name=self.take(); code=name
            while self.peek()=='.': self.take(); code+='.'+self.take()
            args=self.arguments() if self.peek()=='(' else []
            left=Expr('new '+code+'('+', '.join(a.code for a in args)+')',name)
            return self.postfix(left)
        if v=='(':
            self.take(); left=self.expression(); self.take(')')
            left=Expr('('+left.code+')',left.type,left.classref,left.method,left.lvalue,
                      left.receiver,left.key,left.store_type,left.store_binding,left.store_form,
                      left.literal_key,left.ambiguous_string_reference)
            return self.postfix(left)
        if v=='[':
            self.take(); items=[]
            while self.peek()!=']':
                items.append(self.expression().code)
                if self.peek()!=',': break
                self.take(',')
            self.take(']'); return self.postfix(Expr('['+', '.join(items)+']','Array'))
        if v=='/':
            # Only literal / /g and whitespace trims occur in the recovered game.
            self.take(); parts=[]
            while self.peek()!='/': parts.append(self.take())
            self.take('/'); flags=self.take() if re.fullmatch('[gimsuy]+',self.peek()) else ''
            # Token spacing cannot represent / /g: recover from exact source span.
            start=self.tokens[self.i-len(parts)-2-(1 if flags else 0)].start
            end=self.tokens[self.i-1].end
            return Expr(SOURCE[start:end],'RegExp')
        value=self.take()
        if value.startswith(('"',"'")):
            # Preserve literal strings, including __DemoStr_0A. The original
            # ABC pool contains those ASCII bytes; it is NOT an LF placeholder.
            literal_key=value[1:-1] if re.fullmatch(r"(?P<quote>[\"'])[A-Za-z_$][A-Za-z0-9_$]*(?P=quote)",value) else None
            return self.postfix(Expr(value,'String',literal_key=literal_key))
        if re.match(r'^(?:\d|\.\d)',value): return self.postfix(Expr(value,'Number'))
        if value in ('true','false'): return Expr(value,'Boolean')
        if value=='null': return Expr(value,'null')
        return self.postfix(self.resolve(value))

    def arguments(self):
        self.take('('); args=[]
        while self.peek()!=')':
            args.append(self.expression())
            if self.peek()!=',': break
            self.take(',')
        self.take(')'); return args

    def postfix(self,left):
        while True:
            if self.peek()=='.':
                self.take(); name=self.take(); found=self.lookup(name,left.classref or left.type)
                typ='int' if name=='length' else '*'; method=None; store_type=None; store_binding=None; ambiguous=False
                if found:
                    member,declaring_owner=found
                    typ=member.type if isinstance(member,Field) else member.result
                    if isinstance(member,Field):
                        if member.static==bool(left.classref):
                            store_type=member.type; store_binding='field:'+declaring_owner+'.'+name
                        elif member.type=='String': ambiguous=True
                    if isinstance(member,Method): method=name
                # String APIs with numeric return types are useful for coercion.
                if name in ('indexOf','lastIndexOf','charCodeAt'): typ='Number'
                if name in ('slice','substring','substr','toLowerCase','toUpperCase','charAt','replace','join'): typ='String'
                left=Expr(left.code+'.'+name,typ,method=method,lvalue=True,
                          receiver=left.code,key=json.dumps(name),store_type=store_type,
                          store_binding=store_binding,store_form='member',ambiguous_string_reference=ambiguous)
            elif self.peek()=='[':
                self.take(); index=self.expression(); self.take(']')
                known_class=left.classref or left.type
                found=self.lookup(index.literal_key,known_class) if index.literal_key is not None else None
                store_type=None; store_binding=None; typ='*'
                if (found and isinstance(found[0],Field) and found[0].type=='String'
                        and found[0].static==bool(left.classref)):
                    store_type='String'; typ='String'
                    store_binding='literal-field:'+found[1]+'.'+index.literal_key
                ambiguous=index.literal_key is None and self.has_string_field(known_class,bool(left.classref))
                if found and isinstance(found[0],Field) and found[0].type=='String' and store_type is None: ambiguous=True
                left=Expr(left.code+'['+index.code+']',typ,lvalue=True,receiver=left.code,key=index.code,
                          store_type=store_type,store_binding=store_binding,store_form='index',
                          ambiguous_string_reference=ambiguous)
            elif self.peek()=='(':
                args=self.arguments()
                if re.fullmatch(r'[A-Za-z_$][\w$]*',left.code): self.calls.add(left.code)
                left=Expr(left.code+'('+', '.join(a.code for a in args)+')',left.type)
            elif self.peek() in ('++','--'):
                op=self.take(); left=self.increment(left,op,postfix=True)
            else: break
        return left

    def statement(self,indent=0):
        pad='  '*indent; v=self.peek()
        if v=='{':
            self.take(); lines=[pad+'{']
            while self.peek()!='}': lines.extend(self.statement(indent+1))
            self.take('}'); lines.append(pad+'}'); return lines
        if v in ('if','while'):
            self.take(); self.take('('); cond=self.expression(); self.take(')')
            lines=[pad+v+' ('+cond.code+')']; lines.extend(self.statement(indent))
            if v=='if' and self.peek()=='else':
                self.take(); lines.append(pad+'else'); lines.extend(self.statement(indent))
            return lines
        if v=='return':
            self.take()
            if self.peek()==';': self.take(); return [pad+'return;']
            expr=self.expression(); self.take(';')
            return [pad+'return '+coerce(expr.code,self.method.result if self.method else '*')+';']
        if v=='var':
            self.take(); name=self.take(); self.take(':'); typ=self.take()
            value=default_value(typ)
            if self.peek()=='=': self.take(); value=self.expression().code
            self.take(';')
            return [pad+'var '+name+' = '+coerce(value,typ)+';']
        if v in ('break','continue'):
            self.take(); self.take(';'); return [pad+v+';']
        if v==';': self.take(); return [pad+';']
        expr=self.expression(); self.take(';')
        if expr.code=='super()' and self.owner and not self.classes[self.owner].parent:
            return []
        return [pad+expr.code+';']

    def body(self,indent=2):
        lines=[]
        while self.peek()!='<eof>':
            try: lines.extend(self.statement(indent))
            except Exception as exc:
                label=(self.owner+'.' if self.owner else '')+(self.method.name if self.method else '<init>')
                raise ValueError(label+': '+self.context()) from exc
        return lines

def field_code(f,classes,globals_,functions,owner):
    if f.initializer:
        t=Translator(f.initializer,classes,globals_,functions,owner)
        expr=t.expression(); assert t.peek()=='<eof>',t.context(); value=expr.code
    else: value=default_value(f.type)
    return ('static ' if f.static else '')+f.name+' = '+coerce(value,f.type)+';'

def generate(source):
    global SOURCE
    SOURCE=source
    tokens=tokenize(source); classes={}; functions={}; globals_={}
    # Class/member declarations are anchored to FFDec's top-level formatting.
    positions={t.start:i for i,t in enumerate(tokens)}
    for match in re.finditer(r'^class\s+(\w+)',source,re.M):
        name=match.group(1)
        if name.startswith(('bb_','gxtk')):
            cls=read_class(tokens,positions[match.start()]); classes[name]=cls
    helper_names={'new_bool_array','new_number_array','new_string_array','new_object_array',
                  'resize_number_array','resize_string_array','resize_object_array',
                  'string_join','string_trim','string_starts_with','string_ends_with','bb_Print'}
    for match in re.finditer(r'^function\s+(\w+)',source,re.M):
        name=match.group(1)
        if name.startswith('bb_') or name in helper_names:
            r=Reader(tokens); r.i=positions[match.start()]; m=read_method(r); functions[name]=m
    for match in re.finditer(r'^var\s+(bb_\w+)',source,re.M):
        r=Reader(tokens); r.i=positions[match.start()]; f=read_field(r); globals_[f.name]=f
    emitted=[c for c in classes.values() if c.name.startswith('bb_')]
    lines=['// GENERATED FILE. Edit scripts/transpile-game.py, not this file.',
           '// Source: reference/simplified/scripts/main.as',
           '// SHA-256: '+hashlib.sha256(source.encode()).hexdigest(),
           '// All gameplay classes/functions mechanically ported; Flash APIs supplied by runtime.js.',
           '"use strict";',
           'function __as3_int(value) { return value | 0; }',
           'function __as3_uint(value) { return value >>> 0; }',
           'function __as3_nullableString(value) { return value === null || value === undefined ? null : String(value); }',
           'function __as3_storeString(object, key, value) {',
           '  object[key] = __as3_nullableString(value);',
           '  return value;',
           '}',
           'function __as3_updateSlot(object, key, delta, postfix, unsigned) {',
           '  const previous = object[key];',
           '  const incremented = previous + delta;',
           '  const next = unsigned ? __as3_uint(incremented) : __as3_int(incremented);',
           '  object[key] = next;',
           '  return postfix ? previous : incremented;',
           '}',
           'function __as3_as(value, type) { return value != null && __as3_is(value, type) ? value : null; }',
           'function __as3_is(value, type) {',
           '  if (type === Array) return Array.isArray(value);',
           '  if (type === Number) return typeof value === "number";',
           '  if (type === String) return typeof value === "string";',
           '  if (type === Boolean) return typeof value === "boolean";',
           '  return value instanceof type;',
           '}', '']
    for f in globals_.values(): lines.append('var '+field_code(f,classes,globals_,functions,None))
    all_calls=set(); method_count=0
    for cls in emitted:
        lines+=['', 'class '+cls.name+(' extends '+cls.parent if cls.parent else '')+' {']
        for f in cls.fields.values(): lines.append('  '+field_code(f,classes,globals_,functions,cls.name))
        for m in cls.methods.values():
            method_count+=1
            name='constructor' if m.name==cls.name else m.name
            sig=('static ' if m.static else '')+name+'('+', '.join(n for n,t in m.params)+')'
            lines.append('  '+sig+' {')
            for n,t in m.params:
                if t in ('int','uint','Number','Boolean','String'): lines.append('    '+n+' = '+coerce(n,t)+';')
            trans=Translator(m.body,classes,globals_,functions,cls.name,m)
            lines.extend(trans.body()); all_calls|=trans.calls; lines.append('  }')
        lines.append('}')
    for m in functions.values():
        lines+=['','function '+m.name+'('+', '.join(n for n,t in m.params)+') {']
        for n,t in m.params:
            if t in ('int','uint','Number','Boolean','String'): lines.append('  '+n+' = '+coerce(n,t)+';')
        trans=Translator(m.body,classes,globals_,functions,None,m)
        lines.extend(trans.body(1)); all_calls|=trans.calls; lines.append('}')
    names=[c.name for c in emitted]+list(functions)
    lines+=['', '// Expose the port for browser integration and deterministic test tooling.',
            'globalThis.ZTPGamePort = {', '  '+',\n  '.join(names)+',',
            '  get state() { return { bb_Game, bb_Audio, bb_mojo_app_device, bb_mojo_graphics_context, bb_std_random_Seed }; },',
            '  setRandomSeed(value) { bb_std_random_Seed = __as3_int(value); }', '};',
            'Object.assign(globalThis, globalThis.ZTPGamePort);', '']
    external=sorted(all_calls-set(functions)-{'__as3_int','__as3_uint','Number','Boolean','String','Array','Object','super'})
    report={'source_sha256':hashlib.sha256(source.encode()).hexdigest(),
            'class_count':len(emitted),'method_count':method_count,'function_count':len(functions),
            'global_count':len(globals_),'classes':[c.name for c in emitted],
            'functions':list(functions),'external_function_calls':external,
            'excluded_platform_classes':[c.name for c in classes.values() if not c.name.startswith('bb_')],
            'notes':['No game methods omitted. All bb_* globals and functions included.',
                     'int/uint writes and function argument/return boundaries are coerced explicitly.',
                     'Declared String stores, ordinary entries and returns coerce null/undefined to null; ordinary String(x) stays distinct.',
                     'String simple assignments retain raw RHS; recovered += preserves read/RHS/write-stem order.',
                     'Original ASCII __DemoStr_0A string preserved, confirmed against SWF ABC pool.',
                     'Flash native/platform implementations intentionally supplied separately.']}
    return '\n'.join(lines),report

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=ROOT/'reference/simplified/scripts/main.as')
    parser.add_argument('--output',type=Path,default=ROOT/'src/generated-game.js')
    parser.add_argument('--report',type=Path,default=ROOT/'src/generated-game.report.json')
    parser.add_argument('--check',action='store_true',help='Verify committed generated files without changing them')
    args=parser.parse_args()
    # Preserve original CRLF bytes in the evidence hash; generate canonical LF
    # output so repeated runs on Windows/Linux produce identical artifacts.
    source_bytes=args.input.read_bytes()
    js,report=generate(source_bytes.decode('utf-8-sig'))
    report['source_file_sha256']=hashlib.sha256(source_bytes).hexdigest()
    report_text=json.dumps(report,ensure_ascii=False,indent=2)+'\n'
    if args.check:
        if args.output.read_bytes()!=js.encode('utf-8') or args.report.read_bytes()!=report_text.encode('utf-8'):
            raise SystemExit('Generated files differ; run python scripts/transpile-game.py')
        print('Generated JavaScript and inventory report exactly match the current source and transpiler.')
        return
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(js,encoding='utf-8',newline='\n')
    args.report.write_text(report_text,encoding='utf-8',newline='\n')
    print(f"Emitted {report['class_count']} classes / {report['method_count']} methods / {report['function_count']} functions / {report['global_count']} globals")
    print('External runtime functions: '+', '.join(report['external_function_calls']))
    print(args.output)

if __name__=='__main__': main()
