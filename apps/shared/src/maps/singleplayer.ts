import {
  GameMapData,
  GameMapObjectType,
  GameMapParseType,
} from '../types/GameMapData'

const data: GameMapData = {
  name: 'default',
  bounds: {
    x: 394,
    y: 743,
  },
  pinball: {
    position: {
      x: 349,
      y: 699,
    },
    radius: 14,
    fill: 'ffffff',
  },
  objects: [
    {
      id: 'wall_spike',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.SVG,
      data: {
        path: 'M16 8C16 3.49998 12.4183 0 8 0C3.58172 0 0 3.50002 0 8C0 12.5 0 478 0 478H150L16 378V171L60 129L16 65C16 65 16 12.5 16 8Z',
      },
    },
    {
      id: 'boundary_horizontal',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.GENERIC,
      data: {
        type: 'rectangle',
        width: 394,
        height: 16,
      },
    },
    {
      id: 'boundary_vertical',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.GENERIC,
      data: {
        type: 'rectangle',
        width: 16,
        height: 547,
      },
    },
    {
      id: 'dome',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.SVG,
      data: {
        path: 'M-0.0012207 197H15.9988C15.9988 97.0365 97.0352 16.5 196.999 16.5C296.962 16.5 378 97.0365 378 197H394C394 88.1999 305.799 0.5 196.999 0.5C88.1987 0.5 -0.0012207 88.1999 -0.0012207 197Z',
      },
    },
    {
      id: 'bumper_circle',
      objectType: GameMapObjectType.BUMPER,
      parseType: GameMapParseType.GENERIC,
      points: 10,
      data: {
        type: 'circle',
        radius: 20,
      },
    },
    {
      id: 'reset',
      objectType: GameMapObjectType.RESET,
      parseType: GameMapParseType.GENERIC,
      data: {
        type: 'rectangle',
        width: 56,
        height: 2,
      },
    },
    {
      id: 'stopper_parts_left',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.SVG,
      data: {
        path: 'M8 0C12.4183 0 16 3.58172 16 8V133.942L68.7259 172.545C72.2908 175.155 73.0649 180.161 70.4549 183.726C67.8448 187.291 62.839 188.065 59.2741 185.455L6.54818 146.852C2.43232 143.839 0 139.043 0 133.942V8C0 3.58172 3.58172 0 8 0Z',
      },
    },
    {
      id: 'stopper_parts_right',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.GENERIC,
      data: {
        type: 'rectangle',
        width: 16,
        height: 80,
        chamferRadius: 8,
      },
    },
    {
      id: 'wall_short',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.GENERIC,
      data: {
        type: 'rectangle',
        width: 16,
        height: 40,
        chamferRadius: 8,
      },
    },
    {
      id: 'paddle',
      objectType: GameMapObjectType.PADDLE,
      parseType: GameMapParseType.SVG,
      anchor: {
        x: 7.5,
        y: 7.5,
      },
      data: {
        path: 'M0 7.5C0 3.1125 3.68072 -0.337939 7.97237 0.0264231L44.0138 3.08635C46.2669 3.27765 48 5.19656 48 7.5C48 9.80344 46.2669 11.7224 44.0138 11.9136L7.97237 14.9736C3.68072 15.3379 0 11.8875 0 7.5Z',
      },
    },
    {
      id: 'redeploy_ball',
      objectType: GameMapObjectType.REDEPLOY_BALL,
      parseType: GameMapParseType.GENERIC,
      data: {
        type: 'rectangle',
        width: 30,
        height: 2,
      },
    },
  ],
  field: [
    // Boundaries
    {
      label: 'boundary_horizontal_bottom',
      objectId: 'boundary_horizontal',
      data: {
        position: {
          x: 0,
          y: 727,
        },
        fill: '292825',
      },
    },
    {
      label: 'boundary_vertical_left',
      objectId: 'boundary_vertical',
      data: {
        position: {
          x: 0,
          y: 196,
        },
        fill: '292825',
      },
    },
    {
      label: 'boundary_vertical_right',
      objectId: 'boundary_vertical',
      data: {
        position: {
          x: 378,
          y: 196,
        },
        fill: '292825',
      },
    },
    {
      label: 'dome',
      objectId: 'dome',
      data: {
        position: {
          x: 0,
          y: 0,
        },
        fill: '292825',
      },
    },

    // Walls
    {
      label: 'wall_spike_left',
      objectId: 'wall_spike',
      data: {
        position: {
          x: 0,
          y: 249,
        },
        fill: '292825',
      },
    },
    {
      label: 'wall_spike_right',
      objectId: 'wall_spike',
      data: {
        scale: {
          x: -1,
          y: 1,
        },
        position: {
          x: 198,
          y: 249,
        },
        fill: '292825',
      },
    },

    // Stoppers
    {
      label: 'stopper_parts_bottom_left_left',
      objectId: 'stopper_parts_left',
      data: {
        position: {
          x: 45,
          y: 454,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'stopper_parts_bottom_left_right',
      objectId: 'stopper_parts_right',
      data: {
        position: {
          x: 101,
          y: 484,
        },
        fill: '796045',
      },
    },
    {
      label: 'stopper_parts_bottom_right_left',
      objectId: 'stopper_parts_left',
      data: {
        position: {
          x: 231,
          y: 454,
        },
        scale: {
          x: -1,
          y: 1,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'stopper_parts_bottom_right_right',
      objectId: 'stopper_parts_right',
      data: {
        position: {
          x: 231,
          y: 484,
        },
        fill: '796045',
      },
    },

    // Paddles
    {
      label: 'paddle_bottom_left',
      objectId: 'paddle',
      data: {
        position: {
          x: 124,
          y: 642.5,
        },
        inactiveAngleDegrees: 30,
        activeAngleDegrees: 30 - 60,
        fill: 'D2423E',
      },
    },
    {
      label: 'paddle_bottom_right',
      objectId: 'paddle',
      data: {
        position: {
          x: 224,
          y: 642.5,
        },
        inactiveAngleDegrees: 150,
        activeAngleDegrees: 150 + 60,
        fill: 'D2423E',
      },
    },

    // Bumpers
    {
      label: 'bumper_1',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 66,
          y: 205,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_2',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 154,
          y: 205,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_3',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 242,
          y: 205,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_4',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 108,
          y: 285,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_5',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 200,
          y: 285,
        },
        fill: 'F3C490',
      },
    },

    // Short walls
    {
      label: 'wall_short_1',
      objectId: 'wall_short',
      data: {
        position: {
          x: 94,
          y: 101,
        },
        fill: '796045',
      },
    },
    {
      label: 'wall_short_2',
      objectId: 'wall_short',
      data: {
        position: {
          x: 166,
          y: 101,
        },
        fill: '796045',
      },
    },
    {
      label: 'wall_short_3',
      objectId: 'wall_short',
      data: {
        position: {
          x: 238,
          y: 101,
        },
        fill: '796045',
      },
    },

    // Reset
    {
      label: 'reset',
      objectId: 'reset',
      data: {
        position: {
          x: 146,
          y: 725,
        },
        fill: 'ffffff',
      },
    },
    {
      label: 'redeploy_ball',
      objectId: 'redeploy_ball',
      data: {
        position: {
          x: 348,
          y: 725,
        },
        fill: 'ffffff',
      },
    },
  ],
}

export default data
