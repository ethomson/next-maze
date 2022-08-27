import type { NextRequest } from 'next/server'
import { useRouter } from 'next/router'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import wasm from './maze-c.wasm?module'

const ID_PREFIX: string = "c";

const IMAGE_SIZE: Point = { x: 300, y: 300 };
const MAZE_SIZE: Point = { x: 63, y: 63 };

const CELL_SIZE: Point = { x: 100, y: 100 };
const PADDING: Point = { x: 0, y: 0 };
const MARGIN: Point = { x: 0, y: 0 };

const WALK_OPACITY: string = "0.6";
const SOLUTION_OPACITY: string = "1.0";
const BACKGROUND_COLOR: string = "var(--bg)";
const WALL_COLOR: string = "var(--wall)";
const SOLUTION_COLOR: string = "var(--solution)";

const ANIMATE: boolean = true;
const ANIMATE_FINAL: boolean = true;

/*
 * Animate with a delay based on the current average execution time
 * of this API route to visually compare with the other API routes.
 */
const ANIMATION_DELAY: number = 0.0036;

interface Point {
    x: number,
    y: number
}

enum Type {
    Passage = 1,
    Wall = 2,
    Unvisited = 4,
    Solution = 8
}

export const config = {
  runtime: 'experimental-edge',
}

function renderStart(): string {
    const total: Point = {
        x: MARGIN.x * 2 + CELL_SIZE.x * MAZE_SIZE.x,
        y: MARGIN.y * 2 + CELL_SIZE.y * MAZE_SIZE.y
    };

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
        `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n` +
        `<svg width="${IMAGE_SIZE.x}" height="${IMAGE_SIZE.y}" viewBox="0 0 ${total.x} ${total.y}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n` +
        `<rect x="0" y="0" width="${total.x}" height="${total.y}" fill="${BACKGROUND_COLOR}" />`;
}

function renderMazeCell(x: number, y: number, cellType: Type): string {
    const displayTypes = Type.Wall | Type.Solution | (ANIMATE ? Type.Passage : 0);

    if ((displayTypes & cellType) == 0) {
        return;
    }

    let opacity = 0;

    switch (cellType) {
        case Type.Wall:
            return `<rect x="${MARGIN.x + (CELL_SIZE.x * x)}" y="${MARGIN.y + (CELL_SIZE.y * y)}" width="${CELL_SIZE.x}" height="${CELL_SIZE.y}" fill="${WALL_COLOR}" />`;

        case Type.Solution:
            if (!ANIMATE && !ANIMATE_FINAL) {
                opacity = 1.0;
            }
            // fallthrough

        case Type.Passage:
            return `<rect id="${ID_PREFIX}${x}_${y}" x="${MARGIN.x + (CELL_SIZE.x * x) + PADDING.x}" y="${MARGIN.y + (CELL_SIZE.y * y) + PADDING.y}" width="${CELL_SIZE.x - (PADDING.x * 2)}" height="${CELL_SIZE.y - (PADDING.y * 2)}" fill="${SOLUTION_COLOR}" opacity="${opacity}" />`;
    }

    throw new Error("unknown maze tile type");
}

function renderEnd() {
    return `</svg>`;
}

export default async function handler(req: NextRequest, event: Event): Promise<Response> {
    const { searchParams } = new URL(req.url);
    let seed: number;

    if (searchParams.get("seed")) {
        seed = parseInt(searchParams.get("seed"), 16);
    } else {
        seed = Math.floor(Math.random() * 4294967295);
    }

    if (MAZE_SIZE.x % 2 == 0 || MAZE_SIZE.y % 2 == 0) {
        throw new Error("maze size must be odd");
    }

    const importObject = {
        env: {
            render_maze_cell: (x, y, cellType) => {
                svgMaze.push(renderMazeCell(x, y, cellType));
            },
            render_move_in: (x, y) => {
                if (ANIMATE) {
                    svgSolution.push(`<animate xlink:href="#${ID_PREFIX}${x}_${y}" attributeName="opacity" from="0" to="${WALK_OPACITY}" dur="${ANIMATION_DELAY}s" begin="${tick}s" fill="freeze"/>`);
                    tick += ANIMATION_DELAY;
                }
            },
            render_move_out: (x, y) => {
                if (ANIMATE) {
                    svgSolution.push(`<animate xlink:href="#${ID_PREFIX}${x}_${y}" attributeName="opacity" from="${WALK_OPACITY}" to="0" dur="${ANIMATION_DELAY}s" begin="${tick}s" fill="freeze"/>`);
                    tick += ANIMATION_DELAY;
                }
            },
            render_solution: (x, y) => {
                if (ANIMATE || ANIMATE_FINAL) {
                    svgSolution.push(`<animate xlink:href="#${ID_PREFIX}${x}_${y}" attributeName="opacity" from="${WALK_OPACITY}" to="${SOLUTION_OPACITY}" dur="${ANIMATION_DELAY}s" begin="${tick}s" fill="freeze"/>`);
                    tick += ANIMATION_DELAY;
                }
            }
        },
    };

    const { exports } = await WebAssembly.instantiate(wasm, importObject) as any;

    let svgMaze: string[] = new Array();
    let svgSolution: string[] = new Array();
    let tick = 0.0;

    const svgHeader = renderStart();
    const generateAndSolveStart = new Date().getTime();
    exports.generate_and_solve_maze(MAZE_SIZE.x, MAZE_SIZE.y, seed);
    const generateAndSolveEnd = new Date().getTime();
    const svgFooter = renderEnd();

    const svg = [ svgHeader, svgMaze.join("\n"), svgSolution.join("\n"), svgFooter ].join("\n");

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Execution-Time": (generateAndSolveEnd - generateAndSolveStart).toString(),
        }
    });
}
