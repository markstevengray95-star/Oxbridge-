import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function q(
  id: string,
  section: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed: number,
): TestQuestion {
  const options = rotate([correct, ...distractors], seed % 4)
  return {
    id,
    test: "ESAT",
    section,
    difficulty: seed % 3 === 0 ? "Challenge" : "Stretch",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

export const esatSpecificationExpansionBank: TestQuestion[] = [
  // Mathematics 1 — fill the broad specification strands that the original
  // calculation bank under-represented.
  q("esat-spec-m1-units-a", "Mathematics 1", "A vehicle travels 7.2 km in 12 minutes. What is its mean speed in km h⁻¹?", "36 km h⁻¹", ["30 km h⁻¹", "42 km h⁻¹", "60 km h⁻¹"], "Twelve minutes is 0.2 h, so speed = 7.2/0.2 = 36 km h⁻¹.", 1),
  q("esat-spec-m1-units-b", "Mathematics 1", "A material has density 2.5 g cm⁻³. What is this density in kg m⁻³?", "2500 kg m⁻³", ["25 kg m⁻³", "250 kg m⁻³", "25000 kg m⁻³"], "1 g cm⁻³ = 1000 kg m⁻³, so 2.5 g cm⁻³ = 2500 kg m⁻³.", 2),
  q("esat-spec-m1-number-a", "Mathematics 1", "What is the highest common factor of 84 and 126?", "42", ["21", "28", "63"], "84 = 2²×3×7 and 126 = 2×3²×7, so the HCF is 2×3×7 = 42.", 3),
  q("esat-spec-m1-number-b", "Mathematics 1", "A length is recorded as 12.4 cm to the nearest 0.1 cm. Which interval contains the true length L?", "12.35 ≤ L < 12.45", ["12.30 ≤ L < 12.50", "12.35 < L ≤ 12.45", "12.40 ≤ L < 12.50"], "Rounding to the nearest 0.1 cm gives half-unit bounds 0.05 cm either side of 12.4.", 4),
  q("esat-spec-m1-geometry-a", "Mathematics 1", "What is each interior angle of a regular hexagon?", "120°", ["108°", "135°", "144°"], "The interior-angle sum is (6−2)×180° = 720°, and 720°/6 = 120°.", 5),
  q("esat-spec-m1-geometry-b", "Mathematics 1", "Two similar shapes have corresponding lengths in the ratio 3:2. What is the ratio of their areas?", "9:4", ["3:2", "6:4", "27:8"], "Area scales with the square of the linear scale factor, so the ratio is 3²:2² = 9:4.", 6),
  q("esat-spec-m1-statistics-a", "Mathematics 1", "For the data set 3, 5, 5, 8, 9, what is the median?", "5", ["6", "8", "9"], "The five values are already ordered, so the middle value is 5.", 7),
  q("esat-spec-m1-statistics-b", "Mathematics 1", "A histogram class from 20 to 26 contains 24 observations. What is its frequency density?", "4", ["3", "6", "24"], "Frequency density = frequency/class width = 24/6 = 4.", 8),
  q("esat-spec-m1-probability-a", "Mathematics 1", "A bag contains 3 red and 2 blue counters. Two counters are drawn without replacement. What is the probability that both are red?", "3/10", ["1/5", "2/5", "9/25"], "P(red then red) = 3/5 × 2/4 = 6/20 = 3/10.", 9),
  q("esat-spec-m1-probability-b", "Mathematics 1", "Independent events A and B have P(A)=0.4 and P(B)=0.5. What is P(A∪B)?", "0.7", ["0.2", "0.5", "0.9"], "For independent events, P(A∩B)=0.4×0.5=0.2; hence P(A∪B)=0.4+0.5−0.2=0.7.", 10),

  // Mathematics 2 — ensure the MM-specific strands are not crowded out by
  // easier geometry and direct calculation questions.
  q("esat-spec-m2-algebra-a", "Mathematics 2", "For p(x)=x³−4x+1, what is the remainder when p(x) is divided by x−2?", "1", ["−1", "3", "5"], "By the Remainder Theorem the remainder is p(2)=8−8+1=1.", 11),
  q("esat-spec-m2-algebra-b", "Mathematics 2", "The quadratic x²−6x+k=0 has exactly one real root. What is k?", "9", ["6", "12", "18"], "A repeated root requires discriminant 36−4k=0, giving k=9.", 12),
  q("esat-spec-m2-sequences-a", "Mathematics 2", "What is the sum of the first five terms of the geometric sequence 3, 6, 12, …?", "93", ["90", "96", "48"], "The five terms are 3, 6, 12, 24 and 48; their sum is 93.", 13),
  q("esat-spec-m2-sequences-b", "Mathematics 2", "A sequence satisfies xₙ₊₁=0.5xₙ+3 with x₁=2. What is x₃?", "5", ["4", "5.5", "6"], "x₂=4 and x₃=0.5×4+3=5.", 14),
  q("esat-spec-m2-integration-a", "Mathematics 2", "Evaluate ∫₀² 3x² dx.", "8", ["4", "6", "12"], "An antiderivative is x³, so the value is 2³−0³=8.", 15),
  q("esat-spec-m2-integration-b", "Mathematics 2", "Which expression is an indefinite integral of 4x−2?", "2x²−2x+C", ["4x²−2x+C", "2x²−2+C", "4x−2+C"], "Integrating term by term gives 2x²−2x+C.", 16),
  q("esat-spec-m2-graphs-a", "Mathematics 2", "The graph y=f(x) is transformed to y=f(x)+3. What happens to every point on the graph?", "It moves 3 units upward.", ["It moves 3 units right.", "It stretches vertically by 3.", "It compresses horizontally by 3."], "Adding 3 to the function value translates the graph vertically upward by 3.", 17),
  q("esat-spec-m2-graphs-b", "Mathematics 2", "Compared with y=f(x), what horizontal transformation produces y=f(2x)?", "A horizontal scale factor of 1/2.", ["A horizontal scale factor of 2.", "A vertical scale factor of 1/2.", "A translation 2 units left."], "Replacing x by 2x halves all x-coordinates, giving a horizontal scale factor of 1/2.", 18),

  // Physics — explicit coverage of the three official strands absent from the
  // original pool: magnetism, thermal physics and radioactivity.
  q("esat-spec-physics-magnetism-a", "Physics", "A 0.20 m wire carries a current of 3.0 A at right angles to a uniform 0.40 T magnetic field. What force acts on the wire?", "0.24 N", ["0.15 N", "0.60 N", "2.40 N"], "F=BIL=0.40×3.0×0.20=0.24 N.", 19),
  q("esat-spec-physics-magnetism-b", "Physics", "An ideal transformer has 500 primary turns and 100 secondary turns. The primary voltage is 230 V. What is the secondary voltage?", "46 V", ["23 V", "115 V", "1150 V"], "Vs/Vp=Ns/Np=100/500=0.2, so Vs=46 V.", 20),
  q("esat-spec-physics-thermal-a", "Physics", "A 2.0 kg block with specific heat capacity 450 J kg⁻¹ °C⁻¹ is heated by 10 °C. How much thermal energy is transferred?", "9000 J", ["900 J", "4500 J", "18000 J"], "Q=mcΔT=2.0×450×10=9000 J.", 21),
  q("esat-spec-physics-thermal-b", "Physics", "A 0.50 kg sample melts at constant temperature. Its specific latent heat of fusion is 334 kJ kg⁻¹. How much energy is required?", "167 kJ", ["83.5 kJ", "334 kJ", "668 kJ"], "E=mL=0.50×334=167 kJ.", 22),
  q("esat-spec-physics-radioactivity-a", "Physics", "A radioactive sample has an initial count rate of 80 counts s⁻¹. After three half-lives, what count rate would be expected from the source alone?", "10 counts s⁻¹", ["20 counts s⁻¹", "30 counts s⁻¹", "40 counts s⁻¹"], "Three half-lives reduce the activity by 2³: 80/8=10 counts s⁻¹.", 23),
  q("esat-spec-physics-radioactivity-b", "Physics", "A nucleus emits an alpha particle. How do its mass number A and atomic number Z change?", "A decreases by 4 and Z by 2.", ["A decreases by 2 and Z by 4.", "A is unchanged and Z decreases by 1.", "A decreases by 4 and Z is unchanged."], "An alpha particle is a helium-4 nucleus containing two protons and two neutrons.", 24),

  // Chemistry — broaden beyond the original quantitative-chemistry-heavy bank.
  q("esat-spec-chem-reactions-a", "Chemistry", "For N₂(g)+3H₂(g)⇌2NH₃(g), what is the effect of increasing pressure at constant temperature?", "The equilibrium shifts toward NH₃.", ["The equilibrium shifts toward N₂ and H₂.", "The equilibrium position is unchanged.", "The reaction stops immediately."], "Higher pressure favours the side with fewer moles of gas: two on the product side rather than four on the reactant side.", 25),
  q("esat-spec-chem-reactions-b", "Chemistry", "Which coefficients balance Al + O₂ → Al₂O₃?", "4, 3, 2", ["2, 1, 1", "2, 3, 1", "4, 2, 2"], "4Al + 3O₂ → 2Al₂O₃ balances four aluminium atoms and six oxygen atoms.", 26),
  q("esat-spec-chem-bonding-a", "Chemistry", "Why can graphite conduct electricity along its layers?", "It has delocalised electrons that can move.", ["Its carbon atoms form mobile ions.", "Its layers contain free protons.", "Its covalent bonds carry whole atoms."], "Each carbon contributes an electron to a delocalised system that can move through the structure.", 27),
  q("esat-spec-chem-bonding-b", "Chemistry", "Why does sodium chloride have a high melting point?", "Strong electrostatic attractions hold oppositely charged ions together.", ["Weak intermolecular forces hold neutral molecules together.", "Metallic bonds hold positive ions in a sea of electrons.", "Covalent bonds join discrete NaCl molecules into pairs."], "A giant ionic lattice requires substantial energy to overcome the attractions between oppositely charged ions.", 28),
  q("esat-spec-chem-acids-a", "Chemistry", "A dilute acid reacts completely with a metal carbonate. Which products are formed?", "A salt, water and carbon dioxide.", ["A salt and hydrogen only.", "A metal oxide and water only.", "A salt, oxygen and water."], "Acid + carbonate → salt + water + carbon dioxide.", 29),
  q("esat-spec-chem-acids-b", "Chemistry", "Compared with a solution at pH 4, approximately how many times greater is the hydrogen-ion concentration at pH 2?", "100 times", ["2 times", "10 times", "1000 times"], "A decrease of two pH units corresponds to a 10²=100-fold increase in hydrogen-ion concentration.", 30),
  q("esat-spec-chem-energetics-a", "Chemistry", "Which sign of enthalpy change corresponds to an exothermic reaction?", "Negative", ["Positive", "Zero in every case", "Undefined"], "An exothermic reaction transfers energy to the surroundings, so products have lower enthalpy than reactants and ΔH is negative.", 31),
  q("esat-spec-chem-energetics-b", "Chemistry", "What is the main effect of a catalyst on a reaction pathway?", "It provides a route with lower activation energy.", ["It increases the reaction enthalpy.", "It increases the energy of the products.", "It changes the equilibrium constant permanently."], "A catalyst speeds both forward and reverse reactions by offering a lower-activation-energy pathway.", 32),
  q("esat-spec-chem-electroorganic-a", "Chemistry", "During electrolysis of molten lead(II) bromide, what forms at the cathode?", "Lead", ["Bromine", "Oxygen", "Hydrogen"], "Pb²⁺ ions move to the cathode and gain electrons to form lead atoms.", 33),
  q("esat-spec-chem-electroorganic-b", "Chemistry", "Which observation is expected when bromine water is shaken with an alkene?", "The orange colour is decolourised.", ["A blue precipitate forms.", "The solution turns lilac.", "A silver mirror forms."], "Bromine adds across the carbon-carbon double bond, removing bromine from solution and decolourising it.", 34),
  q("esat-spec-chem-analysis-a", "Chemistry", "Which observation indicates chloride ions after acidification followed by adding aqueous silver nitrate?", "A white precipitate", ["A cream precipitate", "A yellow precipitate", "A blue solution"], "Silver chloride is a white precipitate; silver bromide is cream and silver iodide is yellow.", 35),
  q("esat-spec-chem-analysis-b", "Chemistry", "Which gaseous pollutant is a major cause of acid rain?", "Sulfur dioxide", ["Methane", "Oxygen", "Nitrogen"], "Sulfur dioxide can form acidic solutions in atmospheric water and is a major contributor to acid rain.", 36),

  // Biology — add explicit biological knowledge strands so the module is not
  // dominated by magnification, percentage and sampling calculations.
  q("esat-spec-bio-cells-a", "Biology", "Which structure controls the movement of substances into and out of both animal and plant cells?", "Cell membrane", ["Cell wall", "Nucleus", "Chloroplast"], "The cell membrane is selectively permeable and regulates exchange with the surroundings.", 37),
  q("esat-spec-bio-cells-b", "Biology", "In osmosis, what is the net movement of water through a partially permeable membrane?", "From higher water potential to lower water potential.", ["From lower water potential to higher water potential.", "From high solute concentration to low solute concentration only.", "Only from cells into pure water."], "Osmosis is the net movement of water down a water-potential gradient through a partially permeable membrane.", 38),
  q("esat-spec-bio-evolution-a", "Biology", "What is a common role of a bacterial plasmid in genetic engineering?", "It acts as a vector carrying inserted DNA.", ["It destroys all bacterial DNA.", "It supplies energy for protein synthesis.", "It prevents DNA replication."], "Plasmids can be cut, receive a gene and then carry that inserted DNA into a bacterial cell.", 39),
  q("esat-spec-bio-evolution-b", "Biology", "A heritable allele increases survival and reproductive success in a particular environment. What is expected over many generations?", "Its frequency tends to increase in the population.", ["Its frequency must immediately become 100%.", "Its frequency must decrease in every population.", "It becomes non-heritable after one generation."], "Natural selection tends to increase the frequency of advantageous heritable variants, although fixation is not guaranteed.", 40),
  q("esat-spec-bio-enzymes-a", "Biology", "Why can a very high temperature reduce the activity of an enzyme?", "The active site changes shape as the enzyme denatures.", ["The substrate permanently gains energy and disappears.", "The enzyme is converted into a carbohydrate.", "All molecular collisions stop at high temperature."], "High temperature can disrupt bonds maintaining the enzyme's tertiary structure and alter its active site.", 41),
  q("esat-spec-bio-enzymes-b", "Biology", "At high substrate concentration, why can enzyme-controlled reaction rate reach a plateau?", "Most active sites are occupied most of the time.", ["Substrate molecules stop moving.", "The enzyme concentration automatically increases.", "The products become enzymes."], "When active sites are saturated, adding more substrate has little effect unless more enzyme becomes available.", 42),
  q("esat-spec-bio-physiology-a", "Biology", "How does the biconcave shape of a red blood cell help its function?", "It increases surface area relative to volume for gas exchange.", ["It creates a rigid cell wall for support.", "It stores extra DNA for respiration.", "It prevents haemoglobin binding oxygen."], "The biconcave shape gives a large surface area and short diffusion distance, supporting rapid oxygen exchange.", 43),
  q("esat-spec-bio-physiology-b", "Biology", "Which combination best explains rapid gas exchange in alveoli?", "Large surface area, thin walls and good blood flow.", ["Small surface area, thick walls and slow blood flow.", "Thick walls, high mucus depth and low ventilation.", "Small surface area, thin walls and no capillaries."], "These adaptations maintain a short diffusion path and steep concentration gradients across a large area.", 44),
  q("esat-spec-bio-immunity-a", "Biology", "Why are antibiotics not effective treatments for viral infections such as influenza?", "Viruses lack the bacterial structures and processes targeted by antibiotics.", ["Viruses are always larger than bacteria.", "Antibiotics only work outside the body.", "Viruses are made entirely of antibiotics."], "Antibiotics target bacterial features such as ribosomes, cell walls or metabolic processes that viruses do not possess.", 45),
  q("esat-spec-bio-immunity-b", "Biology", "Why can vaccination produce a faster response to a later infection by the same pathogen?", "Memory cells enable a quicker secondary immune response.", ["Vaccination removes every pathogen from the environment.", "Red blood cells begin making antibodies permanently.", "The pathogen loses all of its antigens immediately."], "Vaccination can generate memory lymphocytes that respond rapidly when the same antigen is encountered again.", 46),
  q("esat-spec-bio-plants-a", "Biology", "What is the main role of xylem tissue in a vascular plant?", "Transport water and mineral ions from roots upward.", ["Transport sugars from leaves only downward.", "Carry oxygen from stomata to roots in blood.", "Produce gametes in the stem."], "Xylem vessels transport water and dissolved mineral ions from roots through stems to leaves.", 47),
  q("esat-spec-bio-plants-b", "Biology", "What is the immediate effect of stomatal closure on transpiration, assuming other factors stay constant?", "The rate of water loss decreases.", ["The rate of water loss increases.", "Water loss is unchanged in every case.", "Xylem transport reverses direction."], "Closing stomata reduces the route for water vapour diffusion from the leaf and therefore lowers transpiration.", 48),
]
