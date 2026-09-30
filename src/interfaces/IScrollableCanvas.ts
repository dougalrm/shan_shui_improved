import Renderer from "../classes/Renderer";
import ScrollEngine from "../classes/ScrollEngine";

/**
 * Represents the properties for the ScrollableCanvas component.
 *
 * @interface
 */
export interface IScrollableCanvas {
    /**
     * The height of the canvas.
     *
     * @type {number}
     */
    windowHeight: number;

    /**
     * The x-coordinate of the canvas, updated every so often while scrolling. Used to decide what to render.
     *
     * @type {number}
     */
    newPosition: number;

    /**
     * Drives the scroll position every frame, so the canvas can move without React
     *
     * @type {ScrollEngine}
     */
    engine: ScrollEngine;

    /**
     * The width of the canvas.
     *
     * @type {number}
     */
    windowWidth: number;

    /**
     * How much of the painting (in its own units) fits across the window.
     *
     * @type {number}
     */
    viewWidth: number;

    /**
     * Screen pixels per unit of the painting.
     *
     * @type {number}
     */
    scale: number;

    /**
     * Reference to Renderer.
     *
     * @type {Renderer}
     */
    renderer: Renderer;

    /**
     * Incremented whenever the picture is redesigned, so the canvas drops the old one
     *
     * @type {number}
     */
    reloadCount: number;
}
