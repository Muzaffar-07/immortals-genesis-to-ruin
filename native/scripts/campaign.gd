extends RefCounted
class_name Campaign

const MISSIONS = [
 {"name":"FIRST BREATH", "subtitle":"The woods remember", "place":"AUREL / HOUR ZERO", "color":Color(0.13,0.24,0.27),
 "brief":"The Maker has abandoned you in a world that has never seen a sunrise. Find the scattered light. Something between the trees is learning your names.",
 "steps":["Recover three fragments of the Maker", "Survive the awakening", "Reach the sanctuary gate"], "kind":"forest", "collect":3, "waves":2, "limit":0.0},
 {"name":"THE FIRST FLAME", "subtitle":"Do not let it go out", "place":"AUREL / THE LONG NIGHT", "color":Color(0.19,0.24,0.32),
 "brief":"Cold cannot kill an immortal. It can make eternity unbearable. Search the frozen ruins for fuel, light the first fire, and protect it until dawn.",
 "steps":["Gather flint and two bundles of deadwood", "Ignite the hearth", "Defend the fire for 75 seconds"], "kind":"snow", "collect":3, "waves":3, "limit":0.0},
 {"name":"THE LONG AGES", "subtitle":"The bells of the dead", "place":"AUREL / FORTY THOUSAND YEARS", "color":Color(0.26,0.23,0.17),
 "brief":"Your civilization has forgotten who built it. Three armies cross its history to extinguish the Beacon. Hold the square through Stone, Iron, and Engines.",
 "steps":["Activate the Beacon", "Repel three escalating assaults", "Reach the evacuation arch"], "kind":"ruins", "collect":0, "waves":3, "limit":0.0},
 {"name":"EARTHFALL", "subtitle":"No witnesses", "place":"EARTH / CONTAINMENT ZONE 09", "color":Color(0.12,0.19,0.24),
 "brief":"On your world you were gods. Here, you are the aliens. Human soldiers have sealed the crash site. Disable three pylons before the response force overruns you.",
 "steps":["Sabotage three containment pylons", "Eliminate the response commander", "Escape aboard the vessel"], "kind":"base", "collect":3, "waves":2, "limit":0.0},
 {"name":"THE DYING STARS", "subtitle":"Seven heartbeats", "place":"ELSEWHERE / THE LAST MINUTES", "color":Color(0.3,0.13,0.08),
 "brief":"A world is dying beneath your feet. Seven living seeds remain in its ash. Take them through the eastern rift before the sky reaches the ground.",
 "steps":["Rescue seven seeds of life", "Survive the falling sky", "Reach the rift before collapse"], "kind":"ash", "collect":7, "waves":1, "limit":180.0},
 {"name":"THE END OF MAKING", "subtitle":"The thing at the end", "place":"AUREL / THE LAST SECOND", "color":Color(0.18,0.11,0.26),
 "brief":"You have seen every star die. The Unmaking waits where the Maker once stood. Break its three forms, then tear a door through the last second of time.",
 "steps":["Face the Unmaking", "Survive its three forms", "Open the door back to the first morning"], "kind":"void", "collect":0, "waves":0, "limit":0.0}
]
