// keysChecker.js
export function allKeysExist(obj, keys) {
    return keys.every(key => key in obj);
}

