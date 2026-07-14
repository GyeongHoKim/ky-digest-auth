/**
 * semantic-release configuration.
 *
 * Publishing to npm uses OIDC trusted publishing (no NPM_TOKEN); see
 * .github/workflows/release.yml. The default branch is `trunk`.
 *
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ['trunk'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release template placeholders, must stay literal
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
