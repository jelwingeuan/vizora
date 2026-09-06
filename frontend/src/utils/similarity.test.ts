import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  rankSimilarImages,
} from './similarity'


describe(
  'rankSimilarImages',
  () => {
    it(
      'ranks strong matches and filters weak matches',
      () => {
        const results =
          rankSimilarImages(
            [
              1,
              0,
            ],

            [
              {
                id:
                  'medium',

                embedding: [
                  0.7,
                  0.7,
                ],
              },

              {
                id:
                  'perfect',

                embedding: [
                  1,
                  0,
                ],
              },

              {
                id:
                  'weak',

                embedding: [
                  0,
                  1,
                ],
              },

              {
                id:
                  'close',

                embedding: [
                  0.98,
                  0.2,
                ],
              },
            ],
          )

        expect(
          results,
        ).toEqual(
          [
            'perfect',
            'close',
          ],
        )
      },
    )


    it(
      'returns no results when every match is below the minimum score',
      () => {
        const results =
          rankSimilarImages(
            [
              1,
              0,
            ],

            [
              {
                id:
                  'weak-one',

                embedding: [
                  0.4,
                  0.916515,
                ],
              },

              {
                id:
                  'weak-two',

                embedding: [
                  0.3,
                  0.953939,
                ],
              },
            ],
          )

        expect(
          results,
        ).toEqual(
          [],
        )
      },
    )


    it(
      'respects the configured result limit',
      () => {
        const results =
          rankSimilarImages(
            [
              1,
              0,
            ],

            [
              {
                id:
                  'third',

                embedding: [
                  0.8,
                  0.6,
                ],
              },

              {
                id:
                  'first',

                embedding: [
                  1,
                  0,
                ],
              },

              {
                id:
                  'second',

                embedding: [
                  0.9,
                  0.43589,
                ],
              },
            ],

            {
              limit:
                2,

              minimumScore:
                -1,

              scoreWindow:
                2,
            },
          )

        expect(
          results,
        ).toEqual(
          [
            'first',
            'second',
          ],
        )
      },
    )


    it(
      'ignores incompatible embedding dimensions',
      () => {
        const results =
          rankSimilarImages(
            [
              1,
              0,
            ],

            [
              {
                id:
                  'invalid',

                embedding: [
                  1,
                  0,
                  0,
                ],
              },
            ],
          )

        expect(
          results,
        ).toEqual(
          [],
        )
      },
    )
  },
)