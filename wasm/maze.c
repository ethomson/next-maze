#define NULL 0

typedef unsigned int uint32_t;

typedef struct {
    short x;
    short y;
} point;

typedef struct {
    short x;
    short y;
    short directions;
} solvepath;

const point cell_size = { 100, 100 };
const point padding = { 12, 12 };
const point margin = { 0, 0 };

#define MAX_WIDTH 255
#define MAX_HEIGHT 255

#define PASSAGE   1
#define WALL      2
#define UNVISITED 4
#define SOLUTION  8

#define NORTH 1
#define EAST  2
#define WEST  4
#define SOUTH 8

static uint32_t rand_state[4];

static inline uint32_t rotl(const uint32_t x, int k)
{
	return (x << k) | (x >> (32 - k));
}

static inline uint32_t splitmix32(uint32_t *in)
{
    uint32_t z = (*in += 0x9e3779b9);
    z = (z ^ (z >> 16)) * 0x85ebca6b;
    z = (z ^ (z >> 13)) * 0xc2b2ae35;
    return z ^ (z >> 16);
}

static void rand_seed(uint32_t seed)
{
    uint32_t mixer = seed;

    /* Populate the random state based on the seed using splitmix32 */
    rand_state[0] = splitmix32(&mixer);
    rand_state[1] = splitmix32(&mixer);
    rand_state[2] = splitmix32(&mixer);
    rand_state[3] = splitmix32(&mixer);
}

static uint32_t rand_next(void)
{
    /*
     * This is xoshiro128**, a 32-bit PRNG by David Blackman and
     * Sebastiano Vigna. We use this for consistency of generation
     * across implementations.
     */
	const uint32_t result = rotl(rand_state[1] * 5, 7) * 9;
	const uint32_t t = rand_state[1] << 9;

	rand_state[2] ^= rand_state[0];
	rand_state[3] ^= rand_state[1];
	rand_state[1] ^= rand_state[2];
	rand_state[0] ^= rand_state[3];

	rand_state[2] ^= t;

	rand_state[3] = rotl(rand_state[3], 11);

	return result;
}

static void randomize_directions(unsigned short directions[4])
{
    unsigned short i, j, temp;

    for (i = 3; i > 0; i--) {
        j = rand_next() % (i + 1);

        temp = directions[i];
        directions[i] = directions[j];
        directions[j] = temp;
    }
}

static void move(point *start, unsigned short direction, point *finish)
{
    switch (direction) {
        case NORTH:
            finish->x = start->x;
            finish->y = start->y - 1;
            break;
        case EAST:
            finish->x = start->x - 1;
            finish->y = start->y;
            break;
        case SOUTH:
            finish->x = start->x;
            finish->y = start->y + 1;
            break;
        case WEST:
            finish->x = start->x + 1;
            finish->y = start->y;
            break;
    }
}

static unsigned short opposite(unsigned short direction)
{
    switch (direction) {
        case NORTH:
            return SOUTH;
        case EAST:
            return WEST;
        case SOUTH:
            return NORTH;
        case WEST:
            return EAST;
    }

    return 0;
}

static void generate_maze(
    unsigned char maze[MAX_HEIGHT][MAX_WIDTH],
    point *size,
    point *start,
    point *end)
{
    unsigned short x, y;
    unsigned short remain = (size->x / 2) * (size->y / 2);
    unsigned short i;
    point p;

    for (x = 0; x < size->x; x++) {
        for (y = 0; y < size->y; y++) {
            maze[y][x] = WALL;
        }
    }

    /* set up the start and end nodes */
    start->x = 1 + (rand_next() % (size->x / 2)) * 2;
    start->y = 0;
    maze[start->y][start->x] = PASSAGE;

    end->x = 1 + (rand_next() % (size->x / 2)) * 2;
    end->y = size->y - 1;
    maze[end->y][end->x] = PASSAGE;

    /* set up the walk with unvisited passages */
    for (x = 1; x < size->x; x += 2) {
        for (y = 1; y < size->y; y += 2) {
            maze[y][x] = UNVISITED;
        }
    }

    /* select a random unvisited passage to start */
    p.x = 1 + (rand_next() % (size->x / 2)) * 2;
    p.y = 1 + (rand_next() % (size->y / 2)) * 2;

    maze[p.y][p.x] = 0;
    remain--;

    /*
     * Aldous-Broder algorithm: walk through the maze in random
     * directions, removing the wall to the neighbor if we haven't
     * yet seen it
     */
    while (remain > 0) {
        unsigned short directions[] = { NORTH, EAST, SOUTH, WEST };
        randomize_directions(directions);

        for (i = 0; i < 4; i++) {
            point wall, neighbor;

            move(&p, directions[i], &wall);
            move(&wall, directions[i], &neighbor);

            /* stop if we're walking outside the bounds of the maze */
            if (wall.x < 1 || wall.x > (size->x - 2) ||
                wall.y < 1 || wall.y > (size->y - 2)) {
                continue;
            }

            /* remove the wall, mark the neighbor as seen */
            if (maze[neighbor.y][neighbor.x] == UNVISITED) {
                maze[neighbor.y][neighbor.x] = PASSAGE;
                maze[wall.y][wall.x] = PASSAGE;
                remain--;
            }

            p.x = neighbor.x;
            p.y = neighbor.y;
            break;
        }
    }
}

extern void render_move_in(unsigned short x, unsigned short y);
extern void render_move_out(unsigned short x, unsigned short y);
extern void render_solution(unsigned short x, unsigned short y);

static unsigned short solve_maze(
    unsigned char maze[MAX_HEIGHT][MAX_WIDTH],
    const point *size,
    const point *start,
    const point *end)
{
    solvepath stack[size->x * size->y];
    unsigned short directions[] = { NORTH, EAST, SOUTH, WEST };
    unsigned int i, depth = 0;

    stack[0].x = start->x;
    stack[0].y = start->y;
    stack[0].directions = 0;
    depth = 0;

    render_move_in(start->x, start->y);

    while (1) {
        solvepath *current = &stack[depth];
        point next;
        unsigned short direction = 0;

        /* we're at the end; we have our solution path */
        if (current->x == end->x && current->y == end->y) {
            for (i = 0; i <= depth; i++) {
                maze[stack[i].y][stack[i].x] = SOLUTION;
                render_solution(stack[i].x, stack[i].y);
            }

            break;
        }

        /* select the next direction to move in */
        for (i = 0; i < 4; i++) {
            if ((current->directions & directions[i]) == 0) {
                direction = directions[i];
                break;
            }
        }

        /* we've moved every direction, pop this cell off the stack */
        if (!direction) {
            render_move_out(current->x, current->y);

            if (depth-- == 0) {
                return 0;
            }

            continue;
        }

        /* examine the next direction and mark it as seen */
        current->directions |= direction;
        move((point *)current, direction, &next);

        /* don't want to move into a wall or out of bounds */
        if (next.x < 0 || next.x >= size->x ||
            next.y < 0 || next.y > size->y ||
            maze[next.y][next.x] == WALL) {
            continue;
        }

        render_move_in(next.x, next.y);

        depth++;
        stack[depth].x = next.x;
        stack[depth].y = next.y;
        stack[depth].directions = opposite(direction);
    }

    return 1;
}

extern void render_maze_cell(
    unsigned short x,
    unsigned short y,
    unsigned char type);

static void render_maze(
    unsigned char maze[MAX_HEIGHT][MAX_WIDTH], 
    point *size)
{
    unsigned short x, y;

    for (y = 0; y < size->y; y++) {
        for (x = 0; x < size->x; x++) {
            render_maze_cell(x, y, maze[y][x]);
        }
    }
}

extern void report_heat(unsigned short heat);

__attribute__((used)) void generate_and_solve_maze(
    int width,
    int height,
    int seed)
{
    width = width > MAX_WIDTH ? MAX_WIDTH : width;
    height = height > MAX_HEIGHT ? MAX_HEIGHT : height;

    unsigned char maze[MAX_HEIGHT][MAX_WIDTH];
    point start, end, size = { width, height };

    if (width % 2 == 0 || height % 2 == 0) {
        return;
    }

    rand_seed(seed);

    generate_maze(maze, &size, &start, &end);
    solve_maze(maze, &size, &start, &end);
    render_maze(maze, &size);
}
