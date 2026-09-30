import React, { ChangeEvent } from "react";
import Range from "../classes/Range";
import Renderer from "../classes/Renderer";
import { Button } from "./Button";
import { IMenu } from "../interfaces/IMenu";
import PRNG from "../classes/PRNG";

export const Menu = ({
    step,
    setStep,
    horizontalScroll,
    autoScroll,
    toggleAutoScroll,
    newPosition,
    setNewPosition,
    windowWidth,
    windowHeight,
    renderer,
    saveRange,
    onChangeSaveRange,
    toggleAutoLoad,
    darkMode,
    onReload,
    initalSeed,
}: IMenu) => {
    // Maximum step value calculation
    const maxStep = newPosition + windowWidth + Renderer.forwardCoverage;

    // Handlers for horizontal scrolling
    const horizontalScrollLeft = () => horizontalScroll(-step);
    const horizontalScrollRight = () => horizontalScroll(step);

    // Handler for downloading SVG
    const downloadSvg = () => {
        if (saveRange.length > 0) {
            renderer.download(initalSeed, saveRange, windowHeight, darkMode);
        } else {
            alert(
                "Range length must be above zero.\nYour current start position is lower than the end position."
            );
        }
    };

    // Handler for loading the current range
    const loadCurrentRange = () => {
        onChangeSaveRange(new Range(newPosition, newPosition + windowWidth));
    };

    // Handlers for changing the save range
    const onChangeSaveRangeL = (event: ChangeEvent<HTMLInputElement>) =>
        onChangeSaveRange(new Range(event.target.valueAsNumber, saveRange.end));

    const onChangeSaveRangeR = (event: ChangeEvent<HTMLInputElement>) =>
        onChangeSaveRange(
            new Range(saveRange.start, event.target.valueAsNumber)
        );

    // Handler for changing the step value
    const onInputSetChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.valueAsNumber > Renderer.forwardCoverage) {
            window.alert(
                `Value is too damn high!\n Maximum step is ${Renderer.forwardCoverage}.`
            );
            event.target.value = String(Renderer.forwardCoverage);
            setStep(Renderer.forwardCoverage);
        } else if (event.target.valueAsNumber < 0) {
            window.alert("Value cannot be negative. Setting to 100");
            event.target.value = String(100);
            setStep(100);
        } else {
            setStep(event.target.valueAsNumber);
        }
    };

    // Handler for reloading with a new seed
    const reload = () => {
        const userChoice = window.confirm(
            "This action will redesign the whole picture!"
        );
        if (userChoice) {
            const currentDate = new Date().getTime().toString();
            const state = { info: "Updated URL with new seed" };
            const title = `{Shan, Shui}* - ${currentDate}`;
            const url = `/?seed=${currentDate}`;

            // Use pushState to add to the history stack
            window.history.pushState(state, title, url);

            // Use replaceState to replace the current history entry
            window.history.replaceState(state, title, url);

            // Bring new seed to life
            PRNG.seed = currentDate;

            // Forget the old picture and start the generator from the new seed
            renderer.reset();

            // Back to the start and let the canvas redraw
            setNewPosition(0);
            onReload();
        }
    };

    // Handler for sharing the current seed URL
    const share = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            window.alert(`URL copied to clipboard.\n${url}`);
        });
    };

    return (
        <div id="Menu" className="hidden">
            <div id="CurrentSeed">
                <h4>Current seed:</h4>
                <p>{initalSeed}</p>
                <Button
                    id="Reload"
                    title="Reload the view with new seed"
                    onClick={reload}
                    text="Reload"
                />
            </div>
            <div id="CurrentView">
                <h4>Current view:</h4>
                <p>
                    [{newPosition}, {newPosition + windowWidth}]
                </p>
                <Button
                    id="ScrollLeft"
                    title="Scroll left"
                    onClick={horizontalScrollLeft}
                    text="&lt;"
                />
                <input
                    className="InputStep"
                    title={`Increment step. Value must be between 0 and ${maxStep}.`}
                    type="number"
                    value={step}
                    min={0}
                    max={maxStep}
                    step={100}
                    onChange={onInputSetChange}
                />
                <Button
                    id="ScrollRight"
                    title="Scroll right"
                    onClick={horizontalScrollRight}
                    text="&gt;"
                />
            </div>
            <div id="AutoScroll">
                <input
                    name="Auto-scroll"
                    id="InputAutoScroll"
                    type="checkbox"
                    checked={autoScroll}
                    onChange={toggleAutoScroll}
                />
                <label htmlFor="InputAutoScroll">Auto-scroll</label>
            </div>
            <div id="SaveView">
                <h4>Save view</h4>
                <input
                    title={`Start position of a picture. Value must be between 0 and ${maxStep}. Must be also lower than the end position.`}
                    min={0}
                    max={maxStep}
                    className="InputNumber"
                    type="number"
                    value={saveRange.start}
                    onChange={onChangeSaveRangeL}
                />
                to
                <input
                    title={`End position of a picture. Value must be between 0 and ${maxStep}. Must be also higher than the start position.`}
                    min={0}
                    max={maxStep}
                    className="InputNumber"
                    type="number"
                    value={saveRange.end}
                    onChange={onChangeSaveRangeR}
                />
            </div>
            <div id="AutoLoad">
                <input
                    id="InputAutoLoad"
                    type="checkbox"
                    onChange={toggleAutoLoad}
                />
                <label htmlFor="InputAutoLoad">Auto-load</label>
            </div>
            <div id="ImportCurrentRange">
                <Button
                    id="ButtonLoadRange"
                    title="Import current range"
                    text="Import current range"
                    onClick={loadCurrentRange}
                />
            </div>
            <div id="Download">
                <Button
                    id="ButtonDownload"
                    title="Download"
                    text="Download"
                    onClick={downloadSvg}
                />
                <Button
                    id="Share"
                    title="Share the link"
                    onClick={share}
                    text="Share"
                />
            </div>
        </div>
    );
};
