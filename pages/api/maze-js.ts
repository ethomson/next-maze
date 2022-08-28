import type { NextRequest } from 'next/server'
import { useRouter } from 'next/router'

const ID_PREFIX: string = "js";

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
const ANIMATION_DELAY: number = 0.0081;

interface Point {
    x: number,
    y: number
}

interface SolvePath {
    x: number,
    y: number,
    directions: Direction
}

interface Animation {
    tick: number,
    svg: string[]
}

enum Type {
    Passage = 1,
    Wall = 2,
    Unvisited = 4,
    Solution = 8
}

enum Direction {
    None = 0,
    North = 1,
    East = 2,
    West = 4,
    South = 8
}

export const config = {
  runtime: 'experimental-edge',
}

let randomState: number[] = [ 0, 0, 0, 0 ];
let hot: boolean = false;

function rotl(x: number, k: number) {
    return ((x << k) | (x >>> (32 - k)));
}

function splitmix32(n: number): [ number, number ] {
    let z = n = (n + 0x9e3779b9);
    z = Math.imul((z ^ (z >>> 16)), 0x85ebca6b);
    z = Math.imul((z ^ (z >>> 13)), 0xc2b2ae35);
    return [ n, (z ^ (z >>> 16)) ];
}
 
 function randSeed(seed: number) {
    let mixer: number = seed;

    // Populate the random state based on the seed using splitmix32
    [ mixer, randomState[0] ] = splitmix32(mixer);
    [ mixer, randomState[1] ] = splitmix32(mixer);
    [ mixer, randomState[2] ] = splitmix32(mixer);
    [ mixer, randomState[3] ] = splitmix32(mixer);
}

function randNext(): number {
    // This is xoshiro128**, a 32-bit PRNG by David Blackman and
    // Sebastiano Vigna. We use this for consistency of generation
    // across implementations.
    let result: number = Math.imul(rotl(Math.imul(randomState[1], 5), 7), 9) >>> 0;
    const t: number = randomState[1] << 9;

    randomState[2] ^= randomState[0];
    randomState[3] ^= randomState[1];
    randomState[1] ^= randomState[2];
    randomState[0] ^= randomState[3];

    randomState[2] ^= t;

    randomState[3] = rotl(randomState[3], 11);

    return result;
}

function randomizeDirections(directions: Direction[]) {
    for (let i = directions.length - 1; i > 0; i--) {
        const j = randNext() % (i + 1);
        [ directions[i], directions[j] ] = [ directions[j], directions[i] ]
    }
}

function move(start: Point, direction: Direction): Point {
    switch (direction) {
        case Direction.North:
            return { x: start.x, y: start.y - 1 };
        case Direction.East:
            return { x: start.x - 1, y: start.y };
        case Direction.South:
            return { x: start.x, y: start.y + 1 };
        case Direction.West:
            return { x: start.x + 1, y: start.y };
    }

    return start;
}

function opposite(direction: Direction): Direction {
    switch (direction) {
        case Direction.North:
            return Direction.South;
        case Direction.East:
            return Direction.West;
        case Direction.South:
            return Direction.North;
        case Direction.West:
            return Direction.East;
    }

    return direction;
}

function generateMaze(): [ Type[][], Point, Point ]
{
    let maze: Type[][] = [ ];
    let unvisited = Math.floor(MAZE_SIZE.x / 2) * Math.floor(MAZE_SIZE.y / 2);

    for (let y = 0; y < MAZE_SIZE.y; y++) {
        maze[y] = new Array();

        for (let x = 0; x < MAZE_SIZE.x; x++) {
            maze[y][x] = Type.Wall;
        }
    }

    // set up the start and end nodes 
    let start: Point = {
        x: 1 + (randNext() % Math.floor(MAZE_SIZE.x / 2)) * 2,
        y: 0
    };
    maze[start.y][start.x] = Type.Passage;

    let end: Point = {
        x: 1 + (randNext() % Math.floor(MAZE_SIZE.x / 2)) * 2,
        y: MAZE_SIZE.y - 1
    };
    maze[end.y][end.x] = Type.Passage;

    // set up the walk with unvisited passages
    for (let x = 1; x < MAZE_SIZE.x; x += 2) {
        for (let y = 1; y < MAZE_SIZE.y; y += 2) {
            maze[y][x] = Type.Unvisited;
        }
    }

    // select a random unvisited passage to start
    let p: Point = {
        x: 1 + (randNext() % Math.floor(MAZE_SIZE.x / 2)) * 2,
        y: 1 + (randNext() % Math.floor(MAZE_SIZE.y / 2)) * 2
    };

    maze[p.y][p.x] = Type.Passage;
    unvisited--;

    // Aldous-Broder algorithm: walk through the maze in random
    // directions, removing the wall to the neighbor if we haven't
    // yet seen it
    while (unvisited > 0) {
        let directions: Direction[] = [
            Direction.North,
            Direction.East,
            Direction.South,
            Direction.West
        ];

        randomizeDirections(directions);

        for (let i = 0; i < directions.length; i++) {
            let wall = move(p, directions[i]);
            let neighbor = move(wall, directions[i]);

            // stop if we're walking outside the bounds of the maze
            if (wall.x < 1 || wall.x > (MAZE_SIZE.x - 2) ||
                wall.y < 1 || wall.y > (MAZE_SIZE.y - 2)) {
                continue;
            }

            // remove the wall, mark the neighbor as seen
            if (maze[neighbor.y][neighbor.x] == Type.Unvisited) {
                maze[neighbor.y][neighbor.x] = Type.Passage;
                maze[wall.y][wall.x] = Type.Passage;
                unvisited--;
            }

            p.x = neighbor.x;
            p.y = neighbor.y;
            break;
        }
    }

    return [ maze, start, end ];
}



function renderMoveIn(x: number, y: number, animation: Animation) {
    animation.svg.push(`<animate xlink:href="#${ID_PREFIX}${x}_${y}" attributeName="opacity" from="0" to="${WALK_OPACITY}" dur="${ANIMATION_DELAY}s" begin="${animation.tick}s" fill="freeze"/>`);
    animation.tick += ANIMATION_DELAY;
}

function renderMoveOut(x: number, y: number, animation: Animation) {
    animation.svg.push(`<animate xlink:href="#${ID_PREFIX}${x}_${y}" attributeName="opacity" from="${WALK_OPACITY}" to="0" dur="${ANIMATION_DELAY}s" begin="${animation.tick}s" fill="freeze"/>`);
    animation.tick += ANIMATION_DELAY;
}

function renderSolution(x: number, y: number, animation: Animation) {
    animation.svg.push(`<animate xlink:href="#${ID_PREFIX}${x}_${y}" attributeName="opacity" from="${WALK_OPACITY}" to="${SOLUTION_OPACITY}" dur="${ANIMATION_DELAY}s" begin="${animation.tick}s" fill="freeze"/>`);
    animation.tick += ANIMATION_DELAY;
}

function pointsEqual(a: Point | undefined, b: Point | undefined) {
    return (a && b && a.x == b.x && a.y == b.y);
}

function solveMaze(maze: Type[][], start: Point, end: Point): string {
    let animation = { tick: 0.0, svg: new Array() };
    let stack: SolvePath[] = new Array();
    let directions: Direction[] = [ Direction.North, Direction.East, Direction.South, Direction.West ];

    stack.push({
        x: start.x,
        y: start.y,
        directions: Direction.None
    });

    if (ANIMATE) {
        renderMoveIn(start.x, start.y, animation);
    }

    while (true) {
        let current: SolvePath = stack[stack.length - 1];

        /* we're at the end; we have our solution path */
        if (current.x == end.x && current.y == end.y) {
            for (let item of stack) {
                maze[item.y][item.x] = Type.Solution;

                if (ANIMATE || ANIMATE_FINAL) {
                    renderSolution(item.x, item.y, animation);
                }
            }

            break;
        }

        /* select the next direction to move in */
        let direction: Direction = Direction.None;
        for (let d of directions) {
            if ((current.directions & d) == 0) {
                direction = d;
                break;
            }
        }

        /* we've moved every direction, pop this cell off the stack */
        if (direction == Direction.None) {
            if (ANIMATE) {
                renderMoveOut(current.x, current.y, animation);
            }

            if (stack.length == 0) {
                throw new Error("failed to solve");
            }

            stack.pop();
            continue;
        }

        /* examine the next direction and mark it as seen */
        current.directions |= direction;
        let next = move(current, direction);

        /* don't want to move into a wall or out of bounds */
        if (next.x < 0 || next.x >= MAZE_SIZE.x ||
            next.y < 0 || next.y > MAZE_SIZE.y ||
            maze[next.y][next.x] == Type.Wall) {
            continue;
        }

        if (ANIMATE) {
            renderMoveIn(next.x, next.y, animation);
        }

        stack.push({
            x: next.x,
            y: next.y,
            directions: opposite(direction)
        });
    }

    return animation.svg.join("\n");
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

function renderMaze(maze: Type[][]): string {
    let svg: string[] = new Array();

    for (let y = 0; y < MAZE_SIZE.y; y++) {
        for (let x = 0; x < MAZE_SIZE.x; x++) {
            svg.push(renderMazeCell(x, y, maze[y][x]));
        }
    }

    return svg.join("\n");
}

function renderEnd() {
    return `</svg>`;
}

function generateAndSolveMaze() {
    let [ maze, start, end ] = generateMaze();
    const svgSolution = solveMaze(maze, start, end);
    const svgMaze = renderMaze(maze);

    return [ svgMaze, svgSolution ].join("\n");
}

export default async function handler(req: NextRequest, event: Event): Promise<Response> {
    const generateAndSolveStart = new Date().getTime();

    const { searchParams } = new URL(req.url);
    const seed = searchParams.get('seed');

    if (seed) {
        randSeed(parseInt(seed, 16));
    } else {
        randSeed(Math.floor(Math.random() * 4294967295));
    }

    if (MAZE_SIZE.x % 2 == 0 || MAZE_SIZE.y % 2 == 0) {
        throw new Error("maze size must be odd");
    }

    const svgHeader = renderStart();
    const svgMazeAndSolution = generateAndSolveMaze();
    const svgFooter = renderEnd();

    const svg = [ svgHeader, svgMazeAndSolution, svgFooter ].join("\n");

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Execution-Time": (new Date().getTime() - generateAndSolveStart).toString(),
        }
    });
}
