import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  mergeImageTags,
  normalizeImageTag,
} from './tags'


describe(
  'normalizeImageTag',
  () => {
    it(
      'normalizes whitespace and casing',
      () => {
        expect(
          normalizeImageTag(
            '  Dark   Neon  ',
          ),
        ).toBe(
          'dark neon',
        )
      },
    )
  },
)


describe(
  'mergeImageTags',
  () => {
    it(
      'merges tags without duplicates',
      () => {
        const result =
          mergeImageTags(
            [
              'Cinematic',
              'Dark Neon',
              '  Moody ',
            ],

            [
              'cinematic',
              'dark   neon',
              'architecture',
            ],
          )

        expect(
          result,
        ).toEqual(
          [
            'cinematic',
            'dark neon',
            'moody',
            'architecture',
          ],
        )
      },
    )


    it(
      'removes empty tags',
      () => {
        const result =
          mergeImageTags(
            [
              '',
              '   ',
              'Minimal',
            ],

            [],
          )

        expect(
          result,
        ).toEqual(
          [
            'minimal',
          ],
        )
      },
    )
  },
)