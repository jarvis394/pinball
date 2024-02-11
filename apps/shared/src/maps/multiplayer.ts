import {
  GameMapData,
  GameMapObjectType,
  GameMapParseType,
} from '../types/GameMapData'

const paddleAngleDegreesSwing = 60

const data: GameMapData = {
  name: 'default',
  bounds: {
    x: 400,
    y: 900,
  },
  pinball: {
    position: {
      x: 186,
      y: 436,
    },
    radius: 14,
    fill: 'ffffff',
  },
  objects: [
    {
      id: 'boundary',
      objectType: GameMapObjectType.WALL,
      parseType: GameMapParseType.SVG,
      data: {
        path: 'M0 0V900H175L16 800V630L60 580L16 520V380L60 320L16 270V100L175 0H0Z',
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
        width: 58,
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
  ],
  field: [
    {
      label: 'boundary_left',
      objectId: 'boundary',
      data: {
        position: {
          x: 0,
          y: 0,
        },
        fill: '292825',
      },
    },
    {
      label: 'boundary_right',
      objectId: 'boundary',
      data: {
        position: {
          x: 225,
          y: 0,
        },
        scale: {
          x: -1,
          y: 1,
        },
        fill: '292825',
      },
    },
    {
      label: 'reset_top',
      objectId: 'reset',
      data: {
        position: {
          x: 171,
          y: 0,
        },
        fill: 'ffffff',
      },
    },
    {
      label: 'reset_bottom',
      objectId: 'reset',
      data: {
        position: {
          x: 171,
          y: 898,
        },
        fill: 'ffffff',
      },
    },
    {
      label: 'bumper_1',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 92,
          y: 370,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_2',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 268,
          y: 370,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_3',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 268,
          y: 490,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'bumper_4',
      objectId: 'bumper_circle',
      data: {
        position: {
          x: 92,
          y: 490,
        },
        fill: 'F3C490',
      },
    },
    {
      label: 'stopper_parts_bottom_left_left',
      objectId: 'stopper_parts_left',
      data: {
        position: {
          x: 66,
          y: 624,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'stopper_parts_bottom_left_right',
      objectId: 'stopper_parts_right',
      data: {
        position: {
          x: 122,
          y: 654,
        },
        fill: '796045',
      },
    },
    {
      label: 'stopper_parts_bottom_right_left',
      objectId: 'stopper_parts_left',
      data: {
        position: {
          x: 262,
          y: 624,
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
          x: 262,
          y: 654,
        },
        fill: '796045',
      },
    },
    {
      label: 'stopper_parts_top_left_left',
      objectId: 'stopper_parts_left',
      data: {
        position: {
          x: 66,
          y: 89,
        },
        scale: {
          x: 1,
          y: -1,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'stopper_parts_top_left_right',
      objectId: 'stopper_parts_right',
      data: {
        position: {
          x: 122,
          y: 166,
        },
        fill: '796045',
      },
    },
    {
      label: 'stopper_parts_top_right_left',
      objectId: 'stopper_parts_left',
      data: {
        position: {
          x: 262,
          y: 89,
        },
        scale: {
          x: -1,
          y: -1,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'stopper_parts_top_right_right',
      objectId: 'stopper_parts_right',
      data: {
        position: {
          x: 262,
          y: 166,
        },
        fill: '796045',
      },
    },
    {
      label: 'wall_short_top',
      objectId: 'wall_short',
      data: {
        position: {
          x: 192,
          y: 276,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'wall_short_top',
      objectId: 'wall_short',
      data: {
        position: {
          x: 192,
          y: 584,
        },
        fill: 'C49A6C',
      },
    },
    {
      label: 'paddle_bottom_left',
      objectId: 'paddle',
      data: {
        position: {
          x: 146,
          y: 812.5,
        },
        inactiveAngleDegrees: 30,
        activeAngleDegrees: 30 - paddleAngleDegreesSwing,
        fill: 'D2423E',
      },
    },
    {
      label: 'paddle_bottom_right',
      objectId: 'paddle',
      data: {
        position: {
          x: 254,
          y: 812.5,
        },
        inactiveAngleDegrees: 150,
        activeAngleDegrees: 150 + paddleAngleDegreesSwing,
        fill: 'D2423E',
      },
    },

    {
      label: 'paddle_center_bottom_left',
      objectId: 'paddle',
      data: {
        position: {
          x: 52,
          y: 580,
        },
        inactiveAngleDegrees: 130,
        activeAngleDegrees: 65,
        fill: 'D2423E',
      },
    },
    {
      label: 'paddle_center_bottom_right',
      objectId: 'paddle',
      data: {
        position: {
          x: 348,
          y: 580,
        },
        inactiveAngleDegrees: 50,
        activeAngleDegrees: 115,
        fill: 'D2423E',
      },
    },

    {
      label: 'paddle_center_top_left',
      objectId: 'paddle',
      data: {
        position: {
          x: 52,
          y: 320,
        },
        inactiveAngleDegrees: 230,
        activeAngleDegrees: 295,
        fill: 'D2423E',
      },
    },
    {
      label: 'paddle_center_top_right',
      objectId: 'paddle',
      data: {
        position: {
          x: 348,
          y: 320,
        },
        inactiveAngleDegrees: 310,
        activeAngleDegrees: 245,
        fill: 'D2423E',
      },
    },

    {
      label: 'paddle_top_left',
      objectId: 'paddle',
      data: {
        position: {
          x: 146,
          y: 86.5,
        },
        inactiveAngleDegrees: 30 - paddleAngleDegreesSwing,
        activeAngleDegrees: 30,
        fill: 'D2423E',
      },
    },
    {
      label: 'paddle_top_right',
      objectId: 'paddle',
      data: {
        position: {
          x: 254,
          y: 86.5,
        },
        inactiveAngleDegrees: 150 + paddleAngleDegreesSwing,
        activeAngleDegrees: 150,
        fill: 'D2423E',
      },
    },
  ],
}

export default data
