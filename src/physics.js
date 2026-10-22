/*
 * Zombie Trailer Park 0.33 native Box2D adapter.
 * Ported from the extracted ActionScript wrapper in reference/original/scripts/main.as.
 * The solver is the same-family Box2DFlash 2.1alpha JavaScript port, not replacement physics.
 * This file deliberately does not start a world or alter any bb_* game globals.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ZTPPhysics = api;
    root.installPhysicsGlobals = api.installPhysicsGlobals;
    // Installation defines the original names, but initialization remains explicit.
    api.installPhysicsGlobals(root, root.Box2D);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var stateNames = ['_console', '_world', '_god', '_gravity', '_temp', '_bodycount', '_bodies'];

  function createPhysicsAdapter(Box2D) {
    if (!Box2D || !Box2D.Dynamics || !Box2D.Common) {
      throw new Error('The original-family Box2DWeb solver must be loaded before physics.js.');
    }
    var b2Vec2 = Box2D.Common.Math.b2Vec2;
    var b2World = Box2D.Dynamics.b2World;
    var b2Body = Box2D.Dynamics.b2Body;
    var b2BodyDef = Box2D.Dynamics.b2BodyDef;
    var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
    var b2ContactListener = Box2D.Dynamics.b2ContactListener;
    var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
    var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
    var b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
    var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

    // AS3 typed variables default to null / 0. The array is not cleared on ResetWorld.
    var state = {
      _console: null,
      _world: null,
      _god: null,
      _gravity: null,
      _temp: null,
      _bodycount: 0,
      _bodies: new Array(4096)
    };

    class box2dGod extends b2ContactListener {
      Reset() {
        state._world = new b2World(state._gravity, true);
        state._world.SetContactListener(state._god);
      }
      BeginContact(contact) { /* The original callback has an empty body. */ }
    }

    class box2dBody {
      constructor(body, fixture) {
        this._body = body;
        this._fixture = fixture;
      }
    }

    function box2dLog(message) {
      state._console.appendText(message + '\n');
    }

    function box2dMain(consoleTextField) {
      state._console = consoleTextField;
      state._gravity = new b2Vec2(0, 0);
      state._temp = new b2Vec2(0, 0);
      state._god = new box2dGod();
      state._god.Reset();
    }

    function ResetWorld() {
      state._god.Reset();
      state._bodycount = 0;
    }

    function SetGravity(x, y) {
      state._gravity.x = x;
      state._gravity.y = y;
      state._world.SetGravity(state._gravity);
    }

    function ExplodeBomb(x, y, force) {
      for (var index = 0; index < state._bodycount; ++index) {
        var body = state._bodies[index]._body;
        var position = body.GetPosition();
        var dx = position.x - x;
        var dy = position.y - y;
        var scale = force / Math.sqrt(dx * dx + dy * dy);
        state._temp.x = dx * scale;
        state._temp.y = dy * scale;
        body.ApplyForce(state._temp, position);
      }
    }

    function StepWorld(timeStep, velocityIterations, positionIterations) {
      state._world.Step(timeStep, velocityIterations, positionIterations);
      state._world.ClearForces();
    }

    function CreateDistanceJoint(first, second) {
      var bodyA = state._bodies[first]._body;
      var bodyB = state._bodies[second]._body;
      var definition = new b2DistanceJointDef();
      definition.Initialize(bodyA, bodyB, bodyA.GetPosition(), bodyB.GetPosition());
      state._world.CreateJoint(definition);
    }

    function CreateRevoluteJoint(first, second, lowerAngle, upperAngle) {
      var bodyA = state._bodies[first]._body;
      var bodyB = state._bodies[second]._body;
      var definition = new b2RevoluteJointDef();
      definition.Initialize(bodyA, bodyB, bodyA.GetPosition());
      definition.lowerAngle = lowerAngle;
      definition.upperAngle = upperAngle;
      definition.enableLimit = true;
      state._world.CreateJoint(definition);
    }

    function ReadPositions(output, offset, first, count) {
      var written = 0;
      for (var index = first; index < state._bodycount; ++index) {
        var position = state._bodies[index]._body.GetPosition();
        output[offset++] = position.x;
        output[offset++] = position.y;
        written++;
        if (written >= count) break;
      }
      return written;
    }

    function ReadCollisions(output, offset, count) {
      // This is a stub in the shipped SWF; inventing contact reporting changes its API.
      output[0] = 12;
      return 1;
    }

    function createBody(x, y, shape, friction, density, restitution, dynamic) {
      var definition = new b2BodyDef();
      if (dynamic) definition.type = b2Body.b2_dynamicBody;
      definition.position.Set(x, y);
      var body = state._world.CreateBody(definition);
      body.SetLinearDamping(0.9);
      body.SetAngularDamping(1.5);
      var fixtureDefinition = new b2FixtureDef();
      fixtureDefinition.shape = shape;
      fixtureDefinition.friction = friction;
      if (dynamic) {
        fixtureDefinition.density = density;
        fixtureDefinition.restitution = restitution;
      }
      return new box2dBody(body, body.CreateFixture(fixtureDefinition));
    }

    function CreateBall(x, y, radius, friction, density, restitution) {
      var wrapper = createBody(x, y, new b2CircleShape(radius), friction, density, restitution, true);
      // Raw original ABC retains the old value on the operand stack while setting
      // the incremented counter. FFDec's simplified AS loses that stack temporary.
      var index = state._bodycount++;
      state._bodies[index] = wrapper;
      return index;
    }

    function CreateBox(x, y, halfWidth, halfHeight, friction, density, restitution) {
      var shape = new b2PolygonShape();
      shape.SetAsBox(halfWidth, halfHeight);
      var wrapper = createBody(x, y, shape, friction, density, restitution, true);
      // Raw ABC method 51 confirms post-increment here too. In this method even
      // FFDec's unsimplified AS incorrectly replaces the old stack value with the
      // new counter. See scripts/inspect-physics-abc.py for the original evidence.
      var index = state._bodycount++;
      state._bodies[index] = wrapper;
      return index;
    }

    function CreateStaticBox(x, y, halfWidth, halfHeight, friction) {
      var shape = new b2PolygonShape();
      shape.SetAsBox(halfWidth, halfHeight);
      createBody(x, y, shape, friction, 0, 0, false);
    }

    var api = {
      box2dGod: box2dGod,
      box2dBody: box2dBody,
      box2dLog: box2dLog,
      box2dMain: box2dMain,
      ResetWorld: ResetWorld,
      SetGravity: SetGravity,
      ExplodeBomb: ExplodeBomb,
      StepWorld: StepWorld,
      CreateDistanceJoint: CreateDistanceJoint,
      CreateRevoluteJoint: CreateRevoluteJoint,
      ReadPositions: ReadPositions,
      ReadCollisions: ReadCollisions,
      CreateBall: CreateBall,
      CreateBox: CreateBox,
      CreateStaticBox: CreateStaticBox
    };
    stateNames.forEach(function (name) {
      Object.defineProperty(api, name, {
        enumerable: true,
        get: function () { return state[name]; },
        set: function (value) { state[name] = value; }
      });
    });
    return api;
  }

  function installPhysicsGlobals(target, Box2D) {
    target = target || globalThis;
    if (!Box2D) Box2D = target.Box2D;
    if (!Box2D && typeof require === 'function') Box2D = require('box2dweb');
    var api = createPhysicsAdapter(Box2D);
    Object.keys(api).forEach(function (name) {
      if (stateNames.indexOf(name) >= 0) {
        Object.defineProperty(target, name, {
          configurable: true,
          enumerable: true,
          get: function () { return api[name]; },
          set: function (value) { api[name] = value; }
        });
      } else {
        target[name] = api[name];
      }
    });
    return api;
  }

  return {
    createPhysicsAdapter: createPhysicsAdapter,
    installPhysicsGlobals: installPhysicsGlobals
  };
});
