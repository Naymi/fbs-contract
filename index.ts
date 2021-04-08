import { MyGame } from './test_generated';
import { flatbuffers } from 'flatbuffers';

// Create a `flatbuffer.Builder`, which will be used to create our
// monsters' FlatBuffers.
let builder = new flatbuffers.Builder(1024);

// let weaponOne = builder.createString('Sword');
// let weaponTwo = builder.createString('Axe');
// // Create the first `Weapon` ('Sword').
// MyGame.Sample.Weapon.startWeapon(builder);
// MyGame.Sample.Weapon.addName(builder, weaponOne);
// MyGame.Sample.Weapon.addDamage(builder, 3);
// let sword = MyGame.Sample.Weapon.endWeapon(builder);
// // Create the second `Weapon` ('Axe').
// MyGame.Sample.Weapon.startWeapon(builder);
// MyGame.Sample.Weapon.addName(builder, weaponTwo);
// MyGame.Sample.Weapon.addDamage(builder, 5);
// let axe = MyGame.Sample.Weapon.endWeapon(builder);

// Serialize a name for our monster, called 'Orc'.
let name = builder.createString('Orc');
// Create a `vector` representing the inventory of the Orc. Each number
// could correspond to an item that can be claimed after he is slain.
let treasure = [1];
// let treasure = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
let inv = MyGame.Sample.Monster.createInventoryVector(builder, treasure);

// Create an array from the two `Weapon`s and pass it to the
// `createWeaponsVector()` method to create a FlatBuffer vector.
// let weaps = [sword, axe];
// let weapons = MyGame.Sample.Monster.createWeaponsVector(builder, weaps);

// MyGame.Sample.Monster.startPathVector(builder, 2);
// MyGame.Sample.Vec3.createVec3(builder, 1.0, 2.0, 3.0);
// MyGame.Sample.Vec3.createVec3(builder, 4.0, 5.0, 6.0);
// let path = builder.endVector();

// Create our monster by using `startMonster()` and `endMonster()`.
MyGame.Sample.Monster.startMonster(builder);
// MyGame.Sample.Monster.addPos(
//   builder,
//   MyGame.Sample.Vec3.createVec3(builder, 1.0, 2.0, 3.0),
// );
// MyGame.Sample.Monster.addHp(builder, 300);
// MyGame.Sample.Monster.addColor(builder, MyGame.Sample.Color.Red);
MyGame.Sample.Monster.addName(builder, name);
MyGame.Sample.Monster.addInventory(builder, inv);
// MyGame.Sample.Monster.addWeapons(builder, weapons);
// MyGame.Sample.Monster.addEquippedType(builder, MyGame.Sample.Equipment.Weapon);
// MyGame.Sample.Monster.addEquipped(builder, axe);
// MyGame.Sample.Monster.addPath(builder, path);
let orc = MyGame.Sample.Monster.endMonster(builder);

// MyGame.Sample.Monster.addEquippedType(builder, MyGame.Sample.Equipment.Weapon); // Union type
// MyGame.Sample.Monster.addEquipped(builder, axe); // Union data

// Call `finish()` to instruct the builder that this monster is complete.
builder.finish(orc); // You could also call `MyGame.Sample.Monster.finishMonsterBuffer(builder,
//                                                                 orc);`.

// This must be called after `finish()`.
let buf = builder.asUint8Array(); // Of type `Uint8Array`.
console.log(buf);

const data = MyGame.Sample.Monster.getRootAsMonster(
  new flatbuffers.ByteBuffer(buf),
);
console.log(data.inventoryLength());
