import Element from "../Element";
import Layer from "../Layer";
import Man from "../structures/Man";
import PRNG from "../PRNG";
import Point from "../Point";
import Rock from "../structures/Rock";
import Stroke from "../elements/Stroke";

const EDGE = "rgba(90,90,90,0.6)";
const FAINT = "rgba(100,100,100,0.4)";

/**
 * A bridge between two foreground hills: a humped stone arch over a short gap, a plank bridge
 * on piers over a longer one. Now and then a traveller is crossing.
 */
export default class BridgeLayer extends Layer {
    /**
     * @param {number} xOffset - Left end
     * @param {number} yOffset - Height of the deck at both ends
     * @param {number} width - Span
     */
    constructor(xOffset: number, yOffset: number, width: number) {
        super("bridge", xOffset, yOffset);

        if (width < 130) {
            this.addArch(xOffset, yOffset, width);
        } else {
            this.addPlanks(xOffset, yOffset, width);
        }

        // Rocks at both ends, bedding the bridge into each bank
        for (const end of [xOffset, xOffset + width]) {
            this.add(
                new Rock(
                    end + PRNG.random(-6, 6),
                    yOffset + 6,
                    PRNG.random(0, 100),
                    PRNG.random(10, 16),
                    2,
                    PRNG.random(20, 30)
                )
            );
        }

        if (PRNG.random() < 0.3) {
            const x = xOffset + width * PRNG.random(0.3, 0.7);
            this.add(
                new Man(x, this.deckAt(x, xOffset, yOffset, width) - 1, PRNG.random() < 0.5, 0.3, undefined, true, 1)
            );
        }
    }

    /** Height of the deck at x: arches hump in the middle, planks sag a little */
    private deckAt(x: number, left: number, y: number, width: number): number {
        const t = (x - left) / width;
        const rise = width < 130 ? -Math.min(26, width * 0.22) : 3;
        return y + rise * Math.sin(Math.PI * t);
    }

    private addArch(left: number, y: number, width: number): void {
        const steps = 14;
        const deck: Point[] = [];
        const underside: Point[] = [];
        const thickness = 6;
        const opening = Math.min(width * 0.4, 34);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = left + width * t;
            const top = this.deckAt(x, left, y, width);
            deck.push(new Point(x, top));
            // A round opening under the hump
            const arch = Math.max(0, Math.sin(Math.PI * t) - 0.25) / 0.75;
            underside.push(new Point(x, top + thickness + opening * (1 - arch)));
        }

        this.add(new Element(deck.concat([...underside].reverse()), 0, 0, "white", "none"));
        this.add(new Stroke(deck, EDGE, EDGE, 1.6, 0.4));
        this.add(new Stroke(underside, EDGE, EDGE, 1.4, 0.4));
        this.addRailing(deck);
    }

    private addPlanks(left: number, y: number, width: number): void {
        const steps = 16;
        const deck: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const x = left + (width * i) / steps;
            deck.push(new Point(x, this.deckAt(x, left, y, width)));
        }

        this.add(new Stroke(deck, EDGE, EDGE, 1.5, 0.4));
        this.add(
            new Stroke(
                deck.map((p) => new Point(p.x, p.y + 3)),
                FAINT,
                FAINT,
                1,
                0.4
            )
        );

        // Piers standing in the water
        const piers = Math.max(1, Math.floor(width / 55));
        for (let p = 1; p <= piers; p++) {
            const x = left + (width * p) / (piers + 1);
            const top = this.deckAt(x, left, y, width) + 3;
            for (const dx of [-2, 2]) {
                this.add(
                    new Stroke(
                        [new Point(x + dx, top), new Point(x + dx, top + PRNG.random(18, 26))],
                        FAINT,
                        FAINT,
                        1,
                        0.3
                    )
                );
            }
        }
        this.addRailing(deck);
    }

    /** Posts and a hand rail */
    private addRailing(deck: Point[]): void {
        const rail = deck.map((p) => new Point(p.x, p.y - 7));
        this.add(new Stroke(rail, FAINT, FAINT, 0.8, 0.3));

        for (let i = 0; i < deck.length; i += 3) {
            this.add(
                new Stroke([deck[i], rail[i]], FAINT, FAINT, 0.7, 0.2)
            );
        }
    }
}
