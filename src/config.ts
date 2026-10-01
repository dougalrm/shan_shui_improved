export const config = {
    world: {
        /** The painting is designed for a canvas this tall and scaled to fit the window */
        height: 900,
        /**
         * The world is designed in chunks this wide. Each is generated from its own seed
         * (the picture's seed plus the chunk number), so the same seed always gives the same
         * landscape, whatever the window size or the order things were looked at.
         */
        chunkWidth: 1000,
    },
    layers: {
        boat: {
            defaultFlip: false,
            man: {
                hasStick: true,
                hatNumber: 2,
            },
            boat: {
                fillColor: "rgba(255, 255, 255, 1)",
            },
            stroke: {
                width: 1,
                fillColor: "rgba(100,100,100,0.4)",
                color: "rgba(100,100,100,0.4)",
                strokeNoise: 0.5,
                strokeWidth: 1,
            },
        },
        backgroundMountain: {
            defaultSeed: 0,
            segments: 5,
            span: 10,
            strokeWidth: 1,
            color: "none",
        },
        bottomMountain: {
            defaultSeed: 0,
            defaultFlatness: 0.5,
            /** Chance of a traveller walking across the top */
            travellerChance: 0.3,
            background: {
                fillColor: "rgba(255, 255, 255, 1)",
                color: "none",
            },
            outline: {
                fillColor: "rgba(100, 100, 100, 0.42)",
                color: "rgba(100, 100, 100, 0.42)",
                strokeWidth: 3,
                strokeNoise: 1,
            },
            texture: {
                size: 80,
                width: 1,
            },
            polyline: {
                fillColor: "rgba(255, 255, 255, 1)",
                color: "none",
                strokeWidth: 2,
            },
            stroke: {
                fillColor: "rgba(100, 100, 100, 0.2)",
                color: "rgba(100, 100, 100, 0.2)",
                strokeWidth: 3,
            },
        },
        middleMountain: {
            defaultSeed: 0,
            defaultMiddleVegetation: true,
            /** Chance of a temple on a mountain in the middle distance, scaled by the scene */
            templeChance: 0.08,
            /** Chance of a pagoda on a ridge of a tall mountain, scaled by the scene */
            pagodaChance: 0.07,
            texture: {
                size: 200,
            },
            rim: {
                colorNoAlfa: "rgba(100, 100, 100,",
                clusters: 2,
            },
            background: {
                fillColor: "rgba(255, 255, 255, 1)",
                strokeColor: "none",
            },
            outline: {
                fillColor: "rgba(100, 100, 100, 0.45)",
                color: "rgba(100, 100, 100, 0.45)",
                strokeWidth: 3,
                strokeNoise: 1,
            },
            top: {
                colorNoAlfa: "rgba(100, 100, 100,",
            },
            middle: {
                colorNoAlfa: "rgba(100, 100, 100,",
            },
            bottom: {
                colorNoAlfa: "rgba(100, 100, 100,",
            },
        },
        farShore: {
            /** The far shore's waterline (the distant mountains stand on 230-280) */
            horizon: 272,
        },
        bank: {
            /** Where the near shore runs, on average (the world is 900 tall) */
            shore: 800,
            /** How far it rolls up and down */
            swing: 50,
            /** Chance of a village on a chunk's bank, scaled by the scene */
            villageChance: 0.8,
            /** Chance of a traveller on a chunk's road, scaled by the scene */
            travellerChance: 0.45,
        },
        pillar: {
            /** Columns are this much taller than the classic mountain they replace */
            heightScale: 1.15,
            /** Keep summits at least this far below the top of the picture */
            topMargin: 40,
            /** In the blend style, where the noise (0-1) is above this there are pillars */
            blendThreshold: 0.5,
        },
        birds: {
            /** Width of a flock */
            width: 160,
            height: 60,
        },
        inscription: {
            /** Width of the space an inscription takes: four poem columns and the signature */
            width: 170,
            height: 200,
            /**
             * Classical landscape poems, all long in the public domain. One line per column,
             * without punctuation, as they are traditionally written on paintings.
             */
            poems: [
                { poet: "录柳宗元诗", lines: ["千山鸟飞绝", "万径人踪灭", "孤舟蓑笠翁", "独钓寒江雪"] },
                { poet: "录王维诗", lines: ["空山不见人", "但闻人语响", "返景入深林", "复照青苔上"] },
                { poet: "录李白诗", lines: ["众鸟高飞尽", "孤云独去闲", "相看两不厌", "只有敬亭山"] },
                { poet: "录贾岛诗", lines: ["松下问童子", "言师采药去", "只在此山中", "云深不知处"] },
                { poet: "录孟浩然诗", lines: ["移舟泊烟渚", "日暮客愁新", "野旷天低树", "江清月近人"] },
                { poet: "录苏轼诗", lines: ["横看成岭侧成峰", "远近高低各不同", "不识庐山真面目", "只缘身在此山中"] },
                { poet: "录杜牧诗", lines: ["远上寒山石径斜", "白云生处有人家", "停车坐爱枫林晚", "霜叶红于二月花"] },
                { poet: "录王维诗", lines: ["空山新雨后", "天气晚来秋", "明月松间照", "清泉石上流"] },
                { poet: "录陶渊明诗", lines: ["采菊东篱下", "悠然见南山", "山气日夕佳", "飞鸟相与还"] },
                { poet: "录王维诗", lines: ["行到水穷处", "坐看云起时"] },
                { poet: "录王之涣诗", lines: ["白日依山尽", "黄河入海流", "欲穷千里目", "更上一层楼"] },
            ],
            /** Seal phrases, two or four characters: e.g. 卧游 "travelling lying down", viewing a landscape painting as a journey */
            seals: ["卧游", "林泉高致", "山水清音", "云烟供养", "烟霞", "听松", "逍遥"],
        },
        water: {
            defaultWaveClusters: 5, // Number of clusters of waves. Water is mostly left as empty paper
            colorNoAlfa: "rgba(100, 100, 100,", // color without the alpha. Need to add alfa value and closing bracket
        },
    },
    utils: {
        bezierCurvePoints: 20,
    },
    renderer: {
        /** order in which the layers should be render */
        tagOrder: {
            backgroundMountain: 1,
            farShore: 1.5,
            sandbar: 3.5,
            // Boats only go on open water, so they can be drawn after the mist and cloud
            // bands (which would veil them) without ever overlapping a mountain
            boat: 4.6,
            // The near bank: in front of the water and the middle mountains' feet, behind the
            // foreground hills that stand on it
            bank: 4.8,
            water: 3,
            middleMountain: 4,
            clouds: 4.5,
            bottomMountain: 5,
            bridge: 5.5,
            inscription: 6,
            birds: 7,
        },
    },
    /**
     * The scenes the scroll moves through (see classes/Scenes.ts). Each profile says what the
     * scene asks of the landscape; they are blended across the borders between scenes.
     */
    scenes: {
        /** The scroll opens quietly */
        opening: "level" as const,
        /** How long each kind of scene runs (world units; a chunk is 1000) */
        length: {
            level: [2000, 3500],
            near: [1500, 3000],
            deep: [2500, 4500],
            high: [3000, 5000],
        } as Record<"level" | "near" | "deep" | "high", [number, number]>,
        /** What may follow each kind of scene: tension, then release */
        next: {
            level: ["deep", "near", "high"],
            near: ["level", "deep", "deep"],
            deep: ["high", "high", "near"],
            high: ["level", "near", "near"],
        } as Record<"level" | "near" | "deep" | "high", Array<"level" | "near" | "deep" | "high">>,
        /** Width of the gradual change from one scene to the next */
        blend: 800,
        /** Noise on top of the scenes' intensity, so no two stretches are the same */
        wobble: 0.2,
        profiles: {
            level: { intensity: 0.05, arc: 0.12, ranges: 6, depth: 0.35, height: 0.6, foreground: 0.6, shore: 5, farShore: 0.85, water: 1.5, clouds: 0.3, temple: 0, pagoda: 0.05, village: 0.4, pavilion: 2.5, travellers: 0.5 },
            near: { intensity: 0.25, arc: 0.15, ranges: 3, depth: 0.45, height: 0.85, foreground: 2.6, shore: -35, farShore: 0.6, water: 1, clouds: 0.5, temple: 0.1, pagoda: 0.1, village: 1, pavilion: 1, travellers: 1 },
            deep: { intensity: 0.45, arc: 0.25, ranges: 1.4, depth: 1.35, height: 0.8, foreground: 0.8, shore: 0, farShore: 0.45, water: 0.6, clouds: 1.3, temple: 1, pagoda: 0.3, village: 0.1, pavilion: 0.6, travellers: 0.5 },
            high: { intensity: 0.5, arc: 0.5, ranges: 1.6, depth: 0.85, height: 1.15, foreground: 0.7, shore: 0, farShore: 0.35, water: 0.5, clouds: 1.8, temple: 0.25, pagoda: 1, village: 0, pavilion: 0.5, travellers: 0.4 },
        },
    },
    designer: {
        radius: 10, // The threshold radius for considering layers to be the same
        xStep: 50, // Step size along the x-axis for generating terrain.
        sandbar: {
            /** Chance that a chunk has a sandbar, scaled down where the landscape is built up */
            chance: 0.7,
            y: { min: 360, max: 640 },
            width: { min: 220, max: 560 },
        },
        clouds: {
            /** Chance per 200 units (scaled by the scene), where the landscape is at least `intensity` built up */
            chance: 0.14,
            intensity: 0.35,
            /** At most this many bands per chunk */
            perChunk: 2,
            y: { min: 260, max: 470 },
            width: { min: 500, max: 1100 },
            height: { min: 40, max: 80 },
        },
        bridge: {
            /** Gaps between foreground hills a bridge can span */
            gap: { min: 40, max: 260 },
            /** The two hills must stand in the same row (their feet this close in height) */
            maxDrop: 5,
            /** Chance that a suitable gap gets a bridge */
            chance: 1,
        },
        birds: {
            /** Chance that a chunk has a flock of geese somewhere in its sky */
            chance: 0.3,
            /** Highest and lowest the flock flies */
            y: { min: 70, max: 190 },
        },
        inscription: {
            /** How strongly a chunk has to stand out to get one (noise, 0-1, see Designer.wantsInscription) */
            threshold: 0.45,
            /** Top of an inscription */
            y: 40,
            /** Clear space kept around it */
            margin: 30,
        },
        hostPeak: {
            /** Only where the landscape is at least this intense (0-1) */
            intensity: 0.8,
            width: { min: 800, max: 1000 },
            height: { min: 520, max: 620 },
            /** Where its foot is, from the top */
            base: { min: 620, max: 680 },
            /** Minimum gap to another host peak */
            spacing: 3000,
        },
        boatY: {
            min: 300,
            max: 690,
        },
        boat: {
            probability: 0.2, // Probability of generating a boat chunk.
            perChunk: 4, // At most this many boats per chunk, so there is never a fleet
            width: 120, // The width of the boat
            y: {
                min: 300,
                max: 690,
            },
        },
        middleMountain: {
            probability: 0.05, // Probability of generating a middle mountain chunk.
            height: {
                min: 100,
                max: 500,
            },
            width: {
                min: 400,
                max: 600,
            },
            xOffset: {
                min: 0,
                max: 500,
            },
            yOffset: 400,
            /** At most this many mountains stacked one in front of another at a spot */
            maxRanks: 7,
            /** Mountains get rarer as a chunk fills up, towards this many */
            perChunk: 22,
        },
        bottomMountain: {
            probability: 0.1, // Probability of generating a flat mountain chunk.
            height: {
                min: 40,
                max: 440,
            },
            width: {
                min: 400,
                max: 600,
            },
            xOffset: {
                min: 0,
                max: 700,
            },
        },
        backgroundMountain: {
            interval: 1000, // Interval at which distant mountains are generated.
            yLocation: {
                min: 230,
                max: 280,
            },
            height: 150,
            width: [500, 1000, 1500],
        },
        water: {
            height: 2, // Height of the waves.
            width: 800, // Width of the waves
        },
    },
    perlin: {
        yWrapb: 4, // Number of bits to wrap along the y-axis.
        zWrapb: 8, // Number of bits to wrap along the z-axis.
        size: 4095, // Size of the perlin array.
        octaves: 4, // Number of octaves used in the Perlin noise generation.
        ampFalloff: 0.5, // Amplitude falloff factor for each octave in the Perlin noise.
    },
    prng: {
        primeOne: 999979,
        primeTwo: 999983,
    },
    structure: {
        house: {
            decorator: {
                horizontalSubPoints: [5, 5, 4],
                verticalSubPoints: [2, 2, 3],
            },
            height: 10,
            perspective: 5,
            defaultStrokeWidth: 50,
            defaultStories: 3,
            defaultRotatation: 0.3,
            defaultStyle: 1,
            defaultHasRail: false,
        },
        pagoda: {
            defaultStrokeWidth: 50,
            defaultStories: 7,
            height: 10,
            rotation: 0.7,
            period: 5,
            decorator: {
                style: 1,
                horizontalSubPoints: 4,
                verticalSubPoints: 2,
            },
        },
        bottomMountain: {
            pavilionChance: 0.15, // Chance of adding pavilion to bottomMountain
        },
    },
    element: {
        defaultFillColor: "rgba(0,0,0,0)",
        defaultStrokeColor: "rgba(0,0,0,0)",
        defaultStrokeWidth: 0,
        blob: {
            defaultAngle: 0,
            defaultFillColor: "rgba(200,200,200,0.9)",
            defaultLength: 20,
            defaultStrokeWidth: 0.5,
            defaultNoise: 0.5,
            resolution: 12,
        },
        branch: {
            defaultHeight: 360,
            defaultStrokeWidth: 6,
            defaultAngle: 0,
            defaultBendingAngle: 0.2 * Math.PI,
            defaultDetails: 10,
        },
        stroke: {
            defaultFillColor: "rgba(200,200,200,0.9)",
            defaultStrokeColor: "rgba(200,200,200,0.9)",
            defaultWidth: 2,
            defaultNoise: 0.5,
            defaultStrokeWidth: 1,
        },
    },
};
