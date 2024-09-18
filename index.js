const msgpack = require('@msgpack/msgpack');
const { createHash } = require('node:crypto');

const main = async () => {
  // just fetch with email as URI
  const task0Json = await fetch(
    'https://ciphersprint.pulley.com/cutler.sheridan@gmail.com'
  );
  const task0 = await task0Json.json();

  // task 1 - no encryption
  const task1Path = task0.encrypted_path;
  const task1 = await fetchNextTask(task1Path);

  // task 2 - array of ascii codes (convert them)
  const task2PathEncrypted = task1.encrypted_path;
  const task2ArrayString = task2PathEncrypted.slice(6, -1).split(',');
  const task2Array = task2ArrayString.map((x) => +x);
  const task2ArrayConverted = task2Array.map((x) => String.fromCharCode(x));
  const task2Path = getPathFromCharArray(task2ArrayConverted);
  const task2Json = await fetch(`https://ciphersprint.pulley.com/${task2Path}`);
  const task2 = await fetchNextTask(task2Path);

  // task 3 - inserted non-hex chars (remove them)
  const task3EncryptedString = getEncryptedString(task2);
  const task3CharArrayEncrypted = [...task3EncryptedString];
  const hexRegex = new RegExp('[0-9a-f]');
  const task3CharArray = task3CharArrayEncrypted.filter((x) =>
    hexRegex.test(x)
  );
  const task3Path = getPathFromCharArray(task3CharArray);
  const task3 = await fetchNextTask(task3Path);

  // task 4 - rotated left by x (must rotate right)
  const task4EncryptedString = getEncryptedString(task3);
  const rotationKey = +task3.encryption_method.slice(26);
  const task4CharArrayEncrypted = [...task4EncryptedString];
  const task4ShiftedArray = task4CharArrayEncrypted.concat(
    task4CharArrayEncrypted.splice(0, task4EncryptedString.length - rotationKey)
  );
  const task4Path = getPathFromCharArray(task4ShiftedArray);
  const task4 = await fetchNextTask(task4Path);

  // task 5 - hex decoded, encrypted with XOR, hex encoded again. key: secret - XOR requires comparisons to be in binary
  const task5EncryptedString = getEncryptedString(task4);
  const key = 'secret';
  const keyBytes = key.split('').map((x) => x.charCodeAt(0));
  const convertedBytes = hexToBytes(task5EncryptedString);
  const decryptedBytes = xorEncrypt(convertedBytes, keyBytes);
  const resultingHex = bytesToHex(decryptedBytes);
  const task5 = await fetchNextTask('task_' + resultingHex);

  console.log(task5);

  // task 6 - scrambled! original positions as base64 encoded messagepack: _____
  const task6EncryptedString = getEncryptedString(task5);
  const messagepackIndex = task5.encryption_method.indexOf('pack:') + 6;
  const messagepack = task5.encryption_method.slice(messagepackIndex);
  const buf = Buffer.from(messagepack, 'base64');
  const uint8 = Uint8Array.from(buf);
  const positions = msgpack.decode(uint8);
  const unshuffledCharArray = [];
  for (let i = 0; i < positions.length; i++) {
    unshuffledCharArray[positions[i]] = task6EncryptedString.charAt(i);
  }
  const task6DecryptedString = unshuffledCharArray.join('');
  const task6Path = 'task_' + task6DecryptedString;
  const task6 = await fetchNextTask(task6Path);

  console.log(task6);
  // task 7 - hashed with sha256, good luck - this is a gimmick, there is no way to solve this task
  // const task7EncryptedString = getEncryptedString(task6);
  // const task7Path = 'task_' + bruteForceSHA256(task7EncryptedString, 32);
  // const task7 = await fetchNextTask(task7Path);

  // console.log(task7);
};

const getEncryptedString = (taskObject) => {
  const encryptedPath = taskObject.encrypted_path;
  return encryptedPath.slice(5);
};
const getPathFromCharArray = (charArray) => {
  return charArray.reduce((prev, cur) => {
    return (prev += cur);
  }, 'task_');
};
const fetchNextTask = async (path) => {
  const taskJson = await fetch(`https://ciphersprint.pulley.com/${path}`);
  const task = await taskJson.json();
  return task;
};
const hexToBytes = (hex) => {
  const result = [];
  for (let i = 0; i < hex.length; i += 2) {
    result.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return result;
};
// also works to decrypt as it's the same operation
const xorEncrypt = (hexBytes, keyBytes) => {
  return hexBytes.map((x, index) => x ^ keyBytes[index % keyBytes.length]);
};
const bytesToHex = (bytes) => {
  return bytes.map((x) => x.toString(16).padStart(2, '0')).join('');
};
// below functions are for gimmick impossible task 7
const charArray = [...'abcdefghijklmnopqrstuvwxyz0123456789'];
function* generateCombinations(length, charArray) {
  const counters = Array(length).fill(0);
  while (true) {
    yield counters.map((x) => charArray[x]).join('');
    let idx = 0;
    while (idx < length && ++counters[idx] === charArray.length) {
      counters[idx] = 0;
      idx++;
    }
    if (idx === length) break;
  }
}
const hashString = (input) => {
  return createHash('sha256').update(input).digest('hex');
};
const bruteForceSHA256 = (targetHash, length) => {
  console.log(`Trying all combinations with length: ${length}`);
  for (const combination of generateCombinations(length, charArray)) {
    const hashedCombination = hashString(combination);
    if (hashedCombination === targetHash) {
      console.log(`Match found!  The string is ${combination}`);
      return combination;
    }
  }
  console.log('No match found with given length.');
};

main();
