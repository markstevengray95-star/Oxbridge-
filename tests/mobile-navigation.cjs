const fs = require('fs')

const nav = fs.readFileSync('components/global-focus-nav.tsx', 'utf8')
const layout = fs.readFileSync('app/layout.tsx', 'utf8')
const mobileCss = fs.readFileSync('app/mobile.css', 'utf8')

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

for (const hub of ['Practice', 'Application', 'Learn', 'Progress']) {
  expect(nav.includes(`label: "${hub}"`), `Missing tidy navigation hub: ${hub}`)
}

for (const destination of ['/full-papers', '/interviews', '/application-profile', '/course-bank', '/school-dashboard', '/account']) {
  expect(nav.includes(`href: "${destination}"`), `Navigation lost destination ${destination}`)
}

expect(nav.includes('mobile-bottom-nav'), 'Mobile bottom navigation is not rendered')
expect(nav.includes('All tools'), 'Mobile all-tools drawer is missing')
expect(nav.includes('Find a tool'), 'Mobile navigation search is missing')
expect(nav.includes('scholarbridge-mobile-mode'), 'Persisted compact-mode preference is missing')
expect(nav.includes('window.matchMedia("(max-width: 767px)")'), 'Automatic phone-mode detection is missing')
expect(nav.includes('env(safe-area-inset-bottom)'), 'Mobile navigation should account for phone safe areas')
expect(mobileCss.includes('[data-slot="tabs-list"]'), 'Mobile tab overflow treatment is missing')
expect(mobileCss.includes('overflow-x: auto'), 'Mobile tab bars should scroll horizontally')
expect(mobileCss.includes('padding-bottom: calc(4.25rem + env(safe-area-inset-bottom))'), 'Pages need bottom-dock clearance')
expect(layout.includes('import "./mobile.css"'), 'Root layout does not load mobile mode styles')

console.log('PASS: mobile mode, compact bottom navigation, searchable grouped tools and mobile tab overflow are wired')
