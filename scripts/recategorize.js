#!/usr/bin/env node
/**
 * recategorize.js
 * Re-runs category inference on all entries currently labeled "other"
 * and updates entries.json in place.
 *
 * Usage:
 *   node scripts/recategorize.js [path/to/entries.json]
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')

const [,, filePath] = process.argv
const FILE = filePath ? resolve(filePath) : resolve(ROOT, 'src/data/entries.json')

// ── Category rules ─────────────────────────────────────────────────────────────
// Ordered: first match wins. Put narrower / higher-confidence rules first.
const CATEGORY_RULES = [
  // ── Financial ──────────────────────────────────────────────────────────────
  {
    cat: 'banking',
    p: /bank|credit.union|savings|financial|invest|brokerage|fidelity|vanguard|schwab|chase|wells.fargo|citi(?:bank|group)|capital.one|amex|american.express|discover|navy.fed|td.bank|pnc|suntrust|regions.bank|us.bank|ally.bank|synchrony|barclays|hsbc|goldman|morgan.stanley|merrill|raymond.james|edward.jones|robinhood|coinbase|paypal|venmo|stripe|square|intuit|turbotax|h&r.block|credit.karma/i,
  },
  {
    cat: 'insurance',
    p: /insurance|geico|progressive|allstate|state.farm|nationwide|usaa|liberty.mutual|travelers|farmers|safeco|esurance|metlife|prudential|new.york.life|guardian|mutual.of.omaha|transamerica|aflac|humana|cigna|anthem|aetna|blue.cross|blue.shield|united.health|uhc|molina|ambetter|oscar.health|coventry|assurant|hippo|lemonade.ins|erie.ind|auto.?owners|sentry.ins|acuity|west.bend|frankenmuth|shelter.ins|encompass/i,
  },
  {
    cat: 'mortgage',
    p: /mortgage|home.loan|refinanc|quicken.loan|rocket.mortgage|loanDepot|pennymac|caliber.home|freedom.mortgage|fairway|homepoint|lakeview|newrez|mr.cooper|carrington.mortgage|homestead.funding|nml|countrywide|indymac|ditech/i,
  },

  // ── Government & Public Services ────────────────────────────────────────────
  {
    cat: 'government',
    p: /\birs\b|social.security|\bssa\b|medicare|medicaid|\bdmv\b|passport|immigration|\buscis\b|\bfema\b|veteran|\bva\.gov\b|usps|post.office|unemployment|\bebt\b|\bsnap\b|dept\b|department.of|\.gov\b|federal.trade|city.of|county.of|municipal|state.of|public.school|transit.auth|port.authority|housing.auth|water.dist|fire.dept|police.dept|sheriff|court.house|clerk.of|secretary.of.state|motor.vehicle|workforce.dev|labor.dept|customs.and|border.patrol/i,
  },

  // ── Telecom & Internet ──────────────────────────────────────────────────────
  {
    cat: 'telecom',
    p: /\bat&t\b|verizon|t.?mobile|sprint|comcast|xfinity|spectrum|cox.comm|dish.net|directv|\bhulu\b|netflix|amazon.prime|charter|centurylink|lumen|frontier.comm|cricket|boost.mobile|metro.pcs|straight.talk|tracfone|net10|consumer.cellular|ting|mint.mobile|google.fi|visible|us.cellular|c.spire|cincinnati.bell|consolidated.comm|windstream|earthlink|netzero|juno.online|aol.dial|cable|internet.service|broadband|wifi.provider|web.hosting|a2.hosting|hostgator|bluehost|godaddy|namecheap|domain.com|network.solutions|wp.engine|cloudflare|rackspace|digitalocean|linode|vultr|siteground|dreamhost|ionos|1&1|register\.com|web\.com|pair.networks|localphone|talou\b/i,
  },

  // ── Healthcare ──────────────────────────────────────────────────────────────
  {
    cat: 'healthcare',
    p: /hospital|clinic|medical.center|health.system|doctor|physician|dental|dentist|pharmacy|cvs|walgreen|rite.aid|mayo.clinic|kaiser|optum|express.scripts|hims\b|hers\b|teladoc|mdlive|heal\b|nurx\b|ro\.health|carbon.health|one.medical|oak.street|iora|concierge.med|chiropractic|optometrist|vision.center|physical.therapy|urgent.care|emergency.care|spinal.surgery|home.health|assisted.living|skilled.nursing|hospice|mental.health|therapy|counseling|addiction|rehab.center|planned.parenthood|fertility|ivf.clinic|dermatology|plastic.surgery|tattoo.removal|blink.tattoo/i,
  },

  // ── Retail & E-commerce ─────────────────────────────────────────────────────
  {
    cat: 'retail',
    p: /amazon(?!.prime)|walmart|target|costco|ebay|etsy|shopify|best.buy|home.depot|lowe(?:'?s|\b)|ikea|wayfair|overstock|chewy|newegg|b&h.photo|adorama|micro.center|fry's.electr|tiger.direct|office.depot|staples|dollar.tree|dollar.general|five.below|tj.maxx|marshalls|ross.stores|burlington.coat|nordstrom|macy|bloomingdale|saks|neiman.marcus|barneys|lord.&.taylor|jcpenney|sears|kmart|big.lots|tuesday.morning|tuesday.m|tuesday.n|goodwill|thrift|consignment|pawn.shop|catalog\.com|clicktoshop|1800flowers|ftd.com|proflowers|teleflora|build.?a.?bear|lego.store|toy'?r'?us|toys.r.us|hallmark|things.remembered|sharper.image|brookstone|restoration.hardware|\brh\b|crate.and.barrel|pottery.barn|williams.sonoma|pier.1|world.market|tuesday.morning|pc.richard|cardcash|accessory|discount.gifts|pool.parts|supplement|vitamin|nutrition|natural.health|drDavid|puritan|swanson.health|iherb|vitacost/i,
  },

  // ── Fashion & Apparel ───────────────────────────────────────────────────────
  {
    cat: 'fashion',
    p: /apparel|clothing|fashion|wear(?:ing)?|shirt|shoes?|boots?|sneaker|footwear|jeans|denim|dress|gown|boutique|designer|couture|luxury.brand|outfitter|uniform|sportswear|activewear|swimwear|lingerie|underwear|sock|hat|cap|glove.store|handbag|purse|luggage|accessori|jewelry|jewellery|watch.brand|sunglasses|eyewear|ll.bean|lands.end|eddie.bauer|columbia.sport|patagonia|north.face|rei.com|eastern.mountain|outdoor.gear|timberland|ugg\b|vans\b|nike\b|adidas|puma\b|reebok|new.balance|under.armour|gap\b|old.navy|banana.republic|j\.crew|ann.taylor|loft\b|white.house.black|express\b|forever.21|h&m\b|zara\b|uniqlo|asos\b|shein\b|fashion.nova|revolve\b|anthropologie|free.people|urban.outfitter|american.eagle|abercrombie|hollister|fabletics|lululemon|bottega|versace|gucci|prada|louis.vuitton|chanel|hermes|burberry|coach\b|kate.spade|michael.kors|tory.burch|ralph.lauren|calvin.klein|tommy.hilfiger|hugo.boss|armani|john.varvatos|andrew.christian|coward.shoe|igigi|cwdkids|fitcustom|qmuniforms|razzle.kids|silk.floral|andrewchristian|andrewch/i,
  },

  // ── Automotive ──────────────────────────────────────────────────────────────
  {
    cat: 'automotive',
    p: /auto(?:motive|liv|zone|nation|trader|parts|repair|body|glass|care|loan|lease)?|car.dealer|car.rental|vehicle|motor(?:s|cycle|cycle)?\b|truck|suv\b|engine|transmission|tire|brake|oil.change|jiffy.lube|valvoline|midas\b|meineke|pep.boys|advance.auto|o'reilly.auto|napa.auto|carmax|carvana|vroom\b|hertz|enterprise.rent|avis\b|budget.car|dollar.rent|thrifty.car|alamo.car|national.car|sixt\b|turo\b|zipcar|ford\b|chevy|chevrolet|gm\b|general.motors|toyota|honda|nissan|hyundai|kia\b|subaru|volkswagen|bmw\b|mercedes|audi\b|lexus|acura|infiniti|cadillac|buick|dodge|ram.truck|jeep\b|chrysler|tesla\b|rivian|lucid.motors|autoliv|cycle.country|rvs?\b|rv.dealer|motorcycle.dealer|harley|kawasaki|yamaha.motor|suzuki.motor/i,
  },

  // ── Travel & Hospitality ────────────────────────────────────────────────────
  {
    cat: 'travel',
    p: /airline|airways|aviation|flight|airport|hotel|resort|motel|inn\b|suites?\b|marriott|hilton|hyatt|ihg\b|wyndham|choice.hotel|best.western|radisson|accor|starwood|sheraton|westin|w.hotel|ritz.carlton|four.seasons|mandarin.oriental|peninsula.hotel|fairmont|kimpton|omni.hotel|loews\b|intercontinental|holiday.inn|ramada|days.inn|super.8|motel.6|la.quinta|comfort.inn|hampton.inn|doubletree|embassy.suites|courtyard|residence.inn|springhill|towneplace|expedia|booking\.com|hotels\.com|trivago|kayak\b|priceline|hotwire|orbitz|travelocity|airbnb|vrbo|homeaway|vacasa|sonder\b|cruise|carnival|royal.caribbean|norwegian.cruise|celebrity.cruise|princess.cruise|viking.cruise|disney.cruise|tour.operator|travel.agent|globus\b|trafalgar|contiki|g.adventures|insight.vac|collette|tauck\b|pleasant.holiday|apple.vacation|sandals\b|club.med|all.inclusive|via.rail|amtrak|greyhound.bus|megabus|flixbus|emirates\b|delta.air|united.air|american.air|southwest|spirit.air|frontier.air|alaska.air|jetblue|air.canada|ac.hotel|time.share|timeshare/i,
  },

  // ── Food & Dining ───────────────────────────────────────────────────────────
  {
    cat: 'food',
    p: /restaurant|dining|food|grocery|supermarket|bakery|confection|candy|chocolate|snack|pretzel|brownie|catering|meal.kit|hello.fresh|blue.apron|sun.basket|home.chef|factor.meals|freshly\b|door.dash|grubhub|uber.eats|postmates|instacart|shipt\b|whole.foods|trader.joe|aldi\b|lidl\b|kroger|safeway|publix|wegmans|giant.food|stop.&.shop|food.lion|h-e-b\b|meijer|sprouts|natural.grocers|fresh.market|earth.fare|mcdonald|burger.king|wendy's|taco.bell|chipotle|subway\b|panera|starbucks|dunkin|domino|pizza.hut|papa.john|little.caesars|kfc\b|popeyes|chick.fil|sonic.drive|dairy.queen|baskin.rob|cold.stone|tcby|jamba.juice|smoothie.king|wingstop|buffalo.wild|applebee|chili's|olive.garden|red.lobster|outback|longhorn|cheesecake.factory|denny's|ihop\b|waffle.house|cracker.barrel|bob.evans|first.watch|fairytale.brownie|sarriscandies|wheatgrass|keystone.pretzel/i,
  },

  // ── Technology & Software ───────────────────────────────────────────────────
  {
    cat: 'technology',
    p: /software|tech(?:nology)?|saas\b|cloud.service|data.service|it.service|computer|laptop|hardware|server|network.(?:solution|service|provider)|cyber|security.software|antivirus|vpn\b|firewall|backup.(?:service|vault)|storage.solution|data.center|managed.service|helpdesk|support.tech|apple\b|microsoft|google\b|amazon.web|aws\b|azure\b|ibm\b|oracle\b|sap\b|salesforce|servicenow|workday|zendesk|hubspot|mailchimp|constant.contact|hootsuite|sprout.social|buffer\b|canva\b|adobe\b|autodesk|solidwork|quickbooks|freshbooks|wave.account|xero\b|square.(?:pos|payroll)|clover\b|toast.pos|lightspeed|shopify.pos|compupros|patriot.memory|a1.data|a1components|onlinebackup|pc.richard|newegg|wp.engine|zonealarm|zeroink|zerdraft/i,
  },

  // ── Real Estate & Moving ────────────────────────────────────────────────────
  {
    cat: 'real_estate',
    p: /real.estate|realty|realtor|property|housing|apartment|condo|townhome|land.lord|tenant|leasing|property.mgmt|hoa\b|homeowner|zillow|redfin|trulia|realtor\.com|homes\.com|apartments\.com|rent\.com|zumper|costar|loopnet|marcus.millichap|keller.williams|re\/max|coldwell|century.21|compass.real|sotheby|bhhs|howard.hanna|weichert|exp.realty|long.&.foster|berkshire.hathaway.home|homestore|move\b|mover|moving|relocation|storage|stor-n-lock|u-haul|pods\b|cube.smart|public.storage|extra.space|life.storage|simply.self|national.storage|guardian.storage|shurgard|lennar|dr.horton|pulte|kb.home|toll.brothers|meritage|ryan.homes|taylor.morrison|beazer|smith.douglas|grand.river.personnel|homestead/i,
  },

  // ── Education ───────────────────────────────────────────────────────────────
  {
    cat: 'education',
    p: /school|university|college|academy|institute|learning|tutoring|curriculum|textbook|course|education|training|certification|e-?learning|online.course|coursera|udemy|edx\b|khan.academy|chegg\b|quizlet|duolingo|rosetta.stone|berlitz|kaplan\b|princeton.review|varsity.tutor|wyzant|a.beka|abcmouse|tynker|code\.org|scratch\b|discovery.education|scholastic|pearson|mcgraw.hill|cengage|houghton.mifflin|wiley\b|sage.pub|for.dummies|cliffsnotes|sparknotes/i,
  },

  // ── Media & Entertainment ───────────────────────────────────────────────────
  {
    cat: 'media',
    p: /media|entertainment|broadcast|television|tv.network|streaming|studio|film|movie|music|record.label|publish|newspaper|magazine|radio|podcast|gaming|game.studio|esport|sports.team|nfl\b|nba\b|mlb\b|nhl\b|mls\b|soccer|baseball|basketball|football|hockey|tennis|golf|racing|espn\b|fox.sport|nbc.sport|cbs.sport|turner.sport|a&e.network|abc.family|abc.network|cnn\b|msnbc|fox.news|the.guardian|new.york.times|wall.street.journal|usa.today|gannett|hearst|condé.nast|meredith|time.inc|viacom|cbs.corp|warner|comcast.nbc|disney\b|universal|paramount|sony.pictures|lionsgate|mgm\b|dreamworks|miami.marlins|yankees|dodgers|cubs\b|red.sox|patriots|cowboys|steelers|lakers|celtics|maple.leafs|theakston/i,
  },

  // ── Pets ───────────────────────────────────────────────────────────────────
  {
    cat: 'pets',
    p: /pet(?:s|co|smart|supplies|solution|care|food|store|sitting|grooming|boarding|adoption|rescue|shelter)|veterinar|vet\b|animal.hosp|animal.clinic|petsolution|petsmart|petco|chewy|petfinder|adopt.?a.?pet|banfield|vca.animal|bluepearl|coral.pet|1800petmeds|doctor.foster|entirely.pets|jefferspet|drsfostersmith/i,
  },

  // ── Home & Garden ──────────────────────────────────────────────────────────
  {
    cat: 'home',
    p: /home.improv|home.repair|home.service|landscap|lawn|garden|nursery|florist|fencing|blind|window.covering|shutter|gutter|roofing|siding|alside\b|insulation|hvac|heating|cooling|plumb|electric(?:ian)|contractor|handyman|painting|flooring|carpet|tile|hardwood|countertop|cabinet|kitchen.remodel|bath.remodel|swimming.pool|pool.encl|pool.parts|pool.supply|spa\b|hot.tub|outdoor.living|deck|patio|pergola|fence|irrigation|sprinkler|pest.control|terminix|orkin|rentokil|home.security|adt\b|simplisafe|ring\b|nest.home|ecobee|honeywell.home|a\+.chicago.moving|a.plus.mov|ab.moving|ruston.mov|aaa.pool/i,
  },

  // ── Shipping & Logistics ────────────────────────────────────────────────────
  {
    cat: 'shipping',
    p: /shipping|logistics|freight|courier|delivery.service|supply.chain|warehouse|fulfillment|parcel|postal|\bups\b|fedex|dhl\b|usps(?!.*government)|purolator|canada.post|royal.mail|australia.post|japan.post|deutsche.post|la.poste|correos|poste.italiane|hongkong.post|singapore.post|a.pronto.delivery|hse.contractor/i,
  },

  // ── Legal & Professional Services ──────────────────────────────────────────
  {
    cat: 'legal',
    p: /law.firm|attorney|lawyer|legal.service|paralegal|notary|bail.bond|court|litigation|lawsuit|arbitration|mediation|contract|patent|trademark|copyright|intellectual.prop|legalzoom|rocket.lawyer|nolo\b|avvo\b|findlaw|martindale|accountant|cpa\b|bookkeep|payroll.service|hr.service|staffing|recruiting|temp.agency|executive.essential|grand.river.personnel|ripple.mgmt|surge.promo/i,
  },

  // ── Fitness & Wellness ──────────────────────────────────────────────────────
  {
    cat: 'fitness',
    p: /gym\b|fitness|yoga|pilates|crossfit|planet.fitness|24.hour.fitness|anytime.fitness|la.fitness|crunch.fitness|equinox|orangetheory|f45\b|solidcore|barre\b|cycling.studio|peloton|beachbody|bowflex|nautilus|icon.health|nordic.track|life.fitness|precor|trek.bike|specialized.bike|giant.bike|cannondale|cycling|martial.art|mma\b|boxing|judo|bjj\b|karate|sports.club|athletic|recreation.center|ymca\b|ywca\b|swim.school|dance.studio|zumba\b/i,
  },

  // ── Energy ─────────────────────────────────────────────────────────────────
  {
    cat: 'utilities',
    p: /electric|gas.company|water.company|utility|utilities|pge\b|duke.energy|con.ed\b|national.grid|dominion.energy|southern.company|fpl\b|centerpoint|entergy|xcel.energy|ameren\b|firstenergy|eversource|avangrid|sempra|pg&e|pacific.gas|commonwealth.edison|consumers.energy|dte.energy|cps.energy|teco.energy|oil.company|petroleum|natural.gas|propane|direct.energy|constellation.energy|green.mountain|spark.energy|reliant.energy|nrg\b|china.national.petroleum/i,
  },

  // ── Non-profit & Community ──────────────────────────────────────────────────
  {
    cat: 'nonprofit',
    p: /non.?profit|charity|foundation|association|institute.for|society.of|coalition|alliance\b|federation|union(?!.pay)|aarp\b|red.cross|salvation.army|habitat.for.human|goodwill|st\.?\s*jude|united.way|feeding.america|world.vision|doctors.without|amnesty|sierra.club|nrdc\b|wwf\b|aclu\b|eff\b|american.cancer|american.heart|alzheimer|autism|veterans.of|wounded.warrior|tunnels.to.tower|fisher.house|elk(?:s\b)|moose.lodge|rotary.club|lions.club|kiwanis|sorority|fraternity|puerto.rican.hispanic.elderly/i,
  },
]

function inferCategory(company = '') {
  for (const { p, cat } of CATEGORY_RULES) {
    if (p.test(company)) return cat
  }
  return 'other'
}

// ── Run ────────────────────────────────────────────────────────────────────────
const entries = JSON.parse(readFileSync(FILE, 'utf8'))
const tally = {}
let updated = 0

for (const entry of entries) {
  if (entry.category !== 'other') continue
  const newCat = inferCategory(entry.company)
  if (newCat !== 'other') {
    tally[newCat] = (tally[newCat] || 0) + 1
    entry.category = newCat
    updated++
  }
}

writeFileSync(FILE, JSON.stringify(entries, null, 2))

console.log(`✅  Recategorized ${updated} entries\n`)
console.log('Breakdown of newly assigned categories:')
Object.entries(tally)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, n]) => console.log(`  ${cat.padEnd(15)} ${n}`))

const stillOther = entries.filter(e => e.category === 'other').length
console.log(`\nStill "other": ${stillOther} / ${entries.length}`)
