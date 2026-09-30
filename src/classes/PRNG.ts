import { config } from "../config";

const PRIM_EONE = config.prng.primeOne;
const PRIM_ETWO = config.prng.primeTwo;
const SEMIPRIM_E = PRIM_EONE * PRIM_ETWO;

/**
 * Pseudo-Random Number Generator (PRNG) class.
 */
export default class PRNG {
    /** Making sure that the PRNG is only seeded once while the App is render, as the get seed code is in the main App */
    static alreadyPopulated: boolean = false;
    static _seed: number;
    /** The value the PRNG was last seeded with, so another PRNG (the generator worker's) can be seeded the same */
    static rawSeed: string | number = 0;

    /**
     * Hashes the input value for use in seeding.
     * @param {string | number} value - The input value to be hashed.
     * @returns The hashed value.
     */
    static hash(value: string | number): number {
        // cyrb53: a fast, well mixed 53-bit string hash. The previous hash summed
        // charCode * 128^i, which loses precision after a few characters and overflows to
        // Infinity for long seeds, so different seeds could produce the same picture.
        const text = JSON.stringify(value);
        let h1 = 0xdeadbeef;
        let h2 = 0x41c6ce57;

        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            h1 = Math.imul(h1 ^ char, 2654435761);
            h2 = Math.imul(h2 ^ char, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }

    /**
     * Sets the seed value for the Pseudorandom Number Generator (PRNG).
     * If the value is undefined, the current timestamp is used as the seed.
     *
     * @param {string | number} value - The value to use for seeding.
     */
    static set seed(value: string | number) {
        let newSeed = 0;
        let z = 0;

        this.rawSeed = value;

        /**
         * Redo the seeding process if the generated value is not suitable.
         */
        const redo = () => {
            newSeed = (this.hash(value) + z) % SEMIPRIM_E;
            z += 1;
        };

        while (
            newSeed % PRIM_EONE === 0 ||
            newSeed % PRIM_ETWO === 0 ||
            newSeed === 0 ||
            newSeed === 1
        ) {
            redo();
        }

        this._seed = newSeed;
        this.alreadyPopulated = true;

        // Skip the first few numbers after seeding
        for (let i = 0; i < 10; i++) {
            this.next();
        }
    }

    static get seed(): number {
        return this._seed;
    }

    /**
     * Generates the next pseudo-random number in the sequence.
     * @returns The next pseudo-random number (float) in the sequence.
     */
    static next(): number {
        this._seed = (this._seed * this._seed) % SEMIPRIM_E;
        return this._seed / SEMIPRIM_E;
    }

    /**
     * Generates a pseudo-random number within the specified range.
     * @param lowerBound - The lower bound of the range.
     * @param upperBound - The upper bound of the range.
     * @returns A pseudo-random number within the specified range or from range [0,1]
     */
    static random(lowerBound: number = 0, upperBound: number = 1): number {
        return this.next() * (upperBound - lowerBound) + lowerBound;
    }

    /**
     * Generates a pseudo-random number that is either -1 or 1.
     * @returns -1 or 1.
     */
    static randomSign(): number {
        return this.random(0, 1) > 0.5 ? -1 : 1;
    }

    /**
     * Randomly choose an element from an array.
     * @param {T[]} array - The array with elements to choose from.
     * @returns {T} A randomly chosen element from the array.
     */
    static randomChoice<T>(array: T[]): T {
        const number = Math.floor(this.random(0, array.length));
        return array[number];
    }

    /**
     * Generate a normalized random number within a range.
     * @param {number} minValue - The minimum value.
     * @param {number} maxValue - The maximum value.
     * @returns {number} A normalized random number within the specified range.
     */
    static normalizedRandom(minValue: number, maxValue: number): number {
        // Maps value from [0, 1] to [minValue, maxValue]
        return this.random() * (maxValue - minValue) + minValue;
    }

    /**
     * Generate a weighted random number based on a function.
     * @param {(value: number) => number} func - The weighting function.
     * @returns {number} A weighted random number.
     */
    static weightedRandom(func: (value: number) => number): number {
        const x = this.random();
        const y = this.random();
        return y < func(x) ? x : this.weightedRandom(func);
    }

    /**
     * Generate a random number with a Gaussian distribution.
     * @returns {number} A random number with a Gaussian distribution.
     */
    static gaussianRandom(): number {
        const value = this.weightedRandom((x) =>
            Math.exp(-24 * Math.pow(x - 0.5, 2))
        );
        return value * 2 - 1;
    }
}
