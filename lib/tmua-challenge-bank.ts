import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const amount = ((shift % items.length) + items.length) % items.length
  return [...items.slice(amount), ...items.slice(0, amount)]
}

function mc(
  id: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed: number,
): TestQuestion {
  const options = rotate([correct, ...distractors], seed % 4)
  return {
    id,
    test: "TMUA",
    section: "Applications of Mathematical Knowledge",
    difficulty: "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

// Original ScholarBridge practice material. These questions deliberately require
// at least two connected steps, a domain/constraint check, or interpretation of
// an intermediate result. They are not reproduced admissions-test questions.
export const tmuaChallengeBank: TestQuestion[] = [
  // Algebra and functions
  mc(
    "tmua-spec-algebra-parameter-roots-challenge",
    "A quadratic x² − (k + 1)x + k = 0 has two real roots whose distance apart is 3. Given that both possible values of k must be considered, which set gives all possible values of k?",
    "k = 4 or k = −2",
    ["k = 4 only", "k = −2 only", "k = 3 or k = −3"],
    "The quadratic factorises as (x−1)(x−k), so its roots are 1 and k. The condition |k−1|=3 gives k−1=±3, hence k=4 or k=−2.",
    0,
  ),
  mc(
    "tmua-spec-algebra-composite-domain-challenge",
    "Let f(x)=2x+3 and let g(t)=t² with domain t≥0. A value of x is allowed only when f(x) lies in the domain of g. Given that g(f(x))=25, which value of x satisfies all the conditions?",
    "x = 1",
    ["x = −4", "x = 1 or x = −4", "x = 11"],
    "From (2x+3)²=25, 2x+3=±5, giving x=1 or x=−4. But g accepts only non-negative inputs, so f(x)≥0; x=−4 gives f(x)=−5 and is excluded.",
    1,
  ),
  mc(
    "tmua-spec-algebra-rational-inequality-challenge",
    "A model is valid only for x<3 and x≠−2. Within that domain, which set of x-values satisfies (x−1)/(x+2)>0?",
    "x < −2 or 1 < x < 3",
    ["−2 < x < 1", "x < 1 or x > 3", "−2 < x < 3"],
    "The fraction changes sign at x=−2 and x=1. It is positive on x<−2 and x>1. Intersecting this with the model condition x<3 gives x<−2 or 1<x<3.",
    2,
  ),
  mc(
    "tmua-spec-algebra-remainders-system-challenge",
    "For P(x)=x³+ax+b, the factor x−1 divides P(x), while division by x−2 leaves remainder 5. Using both conditions together, what is a+b?",
    "−1",
    ["−3", "1", "3"],
    "P(1)=0 gives 1+a+b=0. The remainder condition gives P(2)=8+2a+b=5, so 2a+b=−3. Subtracting yields a=−2 and then b=1, hence a+b=−1.",
    3,
  ),

  // Sequences and series
  mc(
    "tmua-spec-sequences-arithmetic-constraints-challenge",
    "An arithmetic sequence has third term 11 and eighth term 31. After determining both the first term and common difference, what is the sum of the first ten terms?",
    "210",
    ["190", "200", "220"],
    "The five-step gap from term 3 to term 8 gives 5d=20, so d=4. Then a+2d=11 gives a=3. Term 10 is 39, so S10=10(3+39)/2=210.",
    0,
  ),
  mc(
    "tmua-spec-sequences-geometric-two-ratios-challenge",
    "A convergent geometric series has sum to infinity 18 and second term 4. Given that its common ratio r is positive, which set contains every possible value of r?",
    "r = 1/3 or r = 2/3",
    ["r = 1/3 only", "r = 2/3 only", "r = 1/2 or r = 3/4"],
    "If the first term is a, then a/(1−r)=18 and ar=4. Thus 18r(1−r)=4, so 9r²−9r+2=0=(3r−1)(3r−2), giving r=1/3 or 2/3.",
    1,
  ),
  mc(
    "tmua-spec-sequences-recurrence-limit-challenge",
    "A sequence satisfies x₁=11 and xₙ₊₁=(xₙ/2)+3. Its fixed point is 6. Which value is x₄ after using the recurrence rather than assuming the sequence has already reached its limit?",
    "53/8",
    ["13/2", "27/4", "6"],
    "The recurrence gives x₂=17/2, x₃=29/4 and x₄=53/8. Equivalently, xₙ−6 halves each step, so x₄−6=5/8.",
    2,
  ),
  mc(
    "tmua-spec-sequences-binomial-linked-coefficients-challenge",
    "The coefficient of x² in (1+kx)⁴ is equal to the coefficient of x in (1+2x)⁵. Given k>0, which value of k follows from this equality?",
    "√(5/3)",
    ["√(3/5)", "5/3", "10/3"],
    "The x² coefficient is C(4,2)k²=6k². The x coefficient on the other side is C(5,1)·2=10. Hence k²=5/3 and k>0 gives k=√(5/3).",
    3,
  ),

  // Coordinate geometry and circles
  mc(
    "tmua-spec-coordinate-tangent-intercept-challenge",
    "A circle has centre (2,−1), and P=(5,3) lies on the circle. The tangent at P is perpendicular to the radius OP. After finding its gradient, what is the y-intercept of this tangent?",
    "27/4",
    ["17/4", "23/4", "31/4"],
    "The radius from (2,−1) to (5,3) has gradient 4/3, so the tangent gradient is −3/4. Using y−3=−3(x−5)/4 gives y=−3x/4+27/4.",
    0,
  ),
  mc(
    "tmua-spec-coordinate-chord-line-challenge",
    "The circle x²+y²−4x+6y−12=0 is cut by the line y=x−1. Using the centre-to-chord distance as well as the radius, what is the exact chord length?",
    "2√17",
    ["√17", "4√2", "2√21"],
    "Completing squares gives centre (2,−3) and radius 5. The line is x−y−1=0, whose distance from the centre is 4/√2=2√2. Half the chord is √(25−8)=√17, so the chord is 2√17.",
    1,
  ),
  mc(
    "tmua-spec-coordinate-tangent-gradients-challenge",
    "A line y=mx+10 is tangent to the circle x²+y²=25. Comparing the perpendicular distance from the origin to the line with the circle radius, which set gives all possible gradients m?",
    "m = √3 or m = −√3",
    ["m = 3 or m = −3", "m = √2 or m = −√2", "m = 2 or m = −2"],
    "Write the line as mx−y+10=0. Its distance from the origin is 10/√(m²+1). Tangency requires this to equal 5, giving m²+1=4 and m=±√3.",
    2,
  ),
  mc(
    "tmua-spec-coordinate-bisector-intercept-challenge",
    "Points A=(1,2) and B=(7,6) are endpoints of a segment. The perpendicular bisector of AB meets the x-axis at Q. After using both the midpoint and perpendicular-gradient conditions, what is the x-coordinate of Q?",
    "20/3",
    ["16/3", "6", "22/3"],
    "AB has midpoint (4,4) and gradient 2/3, so the perpendicular bisector has gradient −3/2. Setting y=0 in y−4=−3(x−4)/2 gives x−4=8/3, hence x=20/3.",
    3,
  ),

  // Trigonometry
  mc(
    "tmua-spec-trigonometry-sum-product-challenge",
    "For an angle θ, it is known that sinθ+cosθ=1/2. Without determining θ itself, which value must sinθ cosθ take?",
    "−3/8",
    ["−1/4", "1/8", "3/8"],
    "Squaring gives sin²θ+cos²θ+2sinθcosθ=1/4. Since sin²θ+cos²θ=1, we obtain 1+2sinθcosθ=1/4, so sinθcosθ=−3/8.",
    0,
  ),
  mc(
    "tmua-spec-trigonometry-ambiguous-case-challenge",
    "In a triangle, side a=8 is opposite A=30°, while side b=10 is opposite B. Applying the sine rule and then checking the angle sum, how many distinct triangles satisfy these data?",
    "2",
    ["0", "1", "3"],
    "The sine rule gives sinB=10·sin30°/8=5/8. This has two angles between 0° and 180°. Both B and 180°−B leave A+B<180°, so two triangles are possible.",
    1,
  ),
  mc(
    "tmua-spec-trigonometry-double-angle-count-challenge",
    "For 0≤x<2π, consider cos(2x)=sin x. Rewriting the equation as a quadratic in sin x, how many distinct solutions for x are there in the stated interval?",
    "3",
    ["2", "4", "5"],
    "Using cos2x=1−2sin²x gives 2sin²x+sinx−1=0, so sinx=1/2 or sinx=−1. The first gives two solutions and the second one solution, for three in total.",
    2,
  ),
  mc(
    "tmua-spec-trigonometry-sector-linked-data-challenge",
    "A sector has area 12π and arc length 4π. Using both A=(1/2)r²θ and s=rθ, which central angle θ in radians is consistent with these measurements?",
    "2π/3",
    ["π/3", "3π/4", "4π/3"],
    "Since A=(1/2)rs when s=rθ, 12π=(1/2)r(4π), so r=6. Then θ=s/r=4π/6=2π/3.",
    3,
  ),

  // Exponentials and logarithms
  mc(
    "tmua-spec-explog-reciprocal-substitution-challenge",
    "The equation 2^x+2^(−x)=5/2 has two real solutions. After substituting y=2^x and solving the resulting quadratic, what is the product of the two x-values?",
    "−1",
    ["−2", "0", "1"],
    "With y=2^x>0, y+1/y=5/2 gives 2y²−5y+2=0, so y=2 or 1/2. Hence x=1 or x=−1, whose product is −1.",
    0,
  ),
  mc(
    "tmua-spec-explog-domain-combination-challenge",
    "Given x>1, the equation log₂(x−1)+log₂(x+1)=3 is solved by first combining the logarithms and then applying the domain restriction. Which value of x remains?",
    "3",
    ["−3", "2", "4"],
    "Combining logs gives log₂(x²−1)=3, hence x²−1=8 and x=±3. The stated domain x>1 excludes −3, leaving x=3.",
    1,
  ),
  mc(
    "tmua-spec-explog-growth-reconstruct-challenge",
    "A population follows P(t)=P₀a^t. Measurements give P(2)=18 and P(5)=486. After determining the common growth factor from the ratio of these measurements, what is P(4)?",
    "162",
    ["108", "144", "216"],
    "P(5)/P(2)=a³=486/18=27, so a=3. Then P₀=18/9=2, giving P(4)=2·3⁴=162.",
    2,
  ),
  mc(
    "tmua-spec-explog-linked-bases-challenge",
    "Suppose log_a 8=3/2 and log₂ b=log₂ a+1, with a>1 and b>0. Using the first relation to determine a, what is b?",
    "8",
    ["4", "6", "16"],
    "The first relation means a^(3/2)=8, so a=4. The second gives log₂b=log₂4+1=3, hence b=8.",
    3,
  ),

  // Differentiation
  mc(
    "tmua-spec-differentiation-cubic-extreme-challenge",
    "For f(x)=x³−3x²−9x+5, the two stationary points have different types. After finding both and checking the sign change of f′, what is the local maximum value of f?",
    "10",
    ["−22", "5", "14"],
    "f′(x)=3(x−3)(x+1), so x=−1 is the local maximum and x=3 the local minimum. Evaluating f(−1) gives −1−3+9+5=10.",
    0,
  ),
  mc(
    "tmua-spec-differentiation-tangents-point-challenge",
    "Tangents to y=x²+1 are drawn at x=a and are required to pass through the fixed point (0,−3). Solving the tangent condition, which set gives all possible tangent gradients?",
    "−4 and 4",
    ["−2 and 2", "−8 and 8", "0 and 4"],
    "At x=a the tangent is y=2ax+1−a². Passing through (0,−3) gives 1−a²=−3, so a=±2. The corresponding gradients 2a are −4 and 4.",
    1,
  ),
  mc(
    "tmua-spec-differentiation-optimisation-challenge",
    "A rectangle is symmetric about the y-axis, with its upper corners on y=12−x² and lower corners on the x-axis. If the right upper corner has x-coordinate x>0, what is the maximum possible area?",
    "32",
    ["24", "36", "48"],
    "The width is 2x and height is 12−x², so A=24x−2x³. Then A′=24−6x²=0 gives x=2. The rectangle has width 4 and height 8, so its maximum area is 32.",
    2,
  ),
  mc(
    "tmua-spec-differentiation-normal-intercept-challenge",
    "The curve y=x³ has a normal at the point where x=1. After finding the tangent gradient and taking the negative reciprocal, where does this normal cross the y-axis?",
    "4/3",
    ["2/3", "1", "5/3"],
    "At x=1, dy/dx=3, so the normal gradient is −1/3. Through (1,1), its equation is y−1=−(x−1)/3. Setting x=0 gives y=4/3.",
    3,
  ),

  // Integration
  mc(
    "tmua-spec-integration-between-curves-challenge",
    "The curves y=2x and y=x² meet at x=0 and x=2. Taking the upper curve minus the lower curve over the whole interval, what is the enclosed area?",
    "4/3",
    ["2/3", "3/2", "8/3"],
    "On 0<x<2, 2x lies above x². The area is ∫₀²(2x−x²)dx=[x²−x³/3]₀²=4−8/3=4/3.",
    0,
  ),
  mc(
    "tmua-spec-integration-parameter-condition-challenge",
    "A constant k is chosen so that ∫₀²(3x²+k)dx=10. Applying the integral condition to the whole expression, which value of k is required?",
    "1",
    ["−1", "2", "4"],
    "The integral is [x³+kx]₀²=8+2k. Setting 8+2k=10 gives k=1.",
    1,
  ),
  mc(
    "tmua-spec-integration-motion-challenge",
    "A particle has acceleration a(t)=6t−4 and initial velocity v(0)=3. Using integration to obtain velocity and then integrating again, what displacement occurs from t=0 to t=2?",
    "6",
    ["4", "8", "10"],
    "Integrating acceleration gives v=3t²−4t+C, and v(0)=3 gives C=3. Displacement is ∫₀²(3t²−4t+3)dt=[t³−2t²+3t]₀²=6.",
    2,
  ),
  mc(
    "tmua-spec-integration-total-area-challenge",
    "The graph y=x−1 is considered from x=0 to x=3. Because the graph crosses the x-axis, the total geometric area is not the same as the signed integral. What is the total area between the graph and the axis?",
    "5/2",
    ["3/2", "2", "3"],
    "From 0 to 1 there is a triangle of area 1/2 below the axis. From 1 to 3 there is a triangle of area (1/2)·2·2=2 above it. Total area is 1/2+2=5/2.",
    3,
  ),

  // Graphs of functions
  mc(
    "tmua-spec-graphs-transformation-point-challenge",
    "A point (6,−1) lies on y=f(x). The graph is transformed to y=f(2x−4)+3. Matching the transformed input to the original x-coordinate, which point lies on the new graph?",
    "(5, 2)",
    ["(4, 2)", "(5, −4)", "(8, 2)"],
    "To reuse the original input 6, solve 2x−4=6, giving x=5. The output is shifted up by 3, so −1 becomes 2. Hence the transformed point is (5,2).",
    0,
  ),
  mc(
    "tmua-spec-graphs-rational-asymptotes-challenge",
    "For y=(2x+1)/(x−3), identify both asymptotes first. Which point is the intersection of the vertical and horizontal asymptotes?",
    "(3, 2)",
    ["(−3, 2)", "(3, −2)", "(2, 3)"],
    "The denominator vanishes at x=3, giving the vertical asymptote. The ratio of leading coefficients gives horizontal asymptote y=2. They intersect at (3,2).",
    1,
  ),
  mc(
    "tmua-spec-graphs-absolute-intersections-challenge",
    "The graphs y=|x−2| and y=x/2 intersect in two points. Solving separately on the two branches of the modulus, what is the sum of the two x-coordinates?",
    "16/3",
    ["14/3", "5", "6"],
    "For x≥2, x−2=x/2 gives x=4. For x<2, 2−x=x/2 gives x=4/3. Their sum is 4+4/3=16/3.",
    2,
  ),
  mc(
    "tmua-spec-graphs-removable-discontinuity-challenge",
    "A function is defined by f(x)=(x²−4)/(x−2) for x≠2. Which description correctly distinguishes its graph from the graph of the simplified linear expression?",
    "The line y=x+2 with the point (2,4) removed",
    ["The line y=x+2 including the point (2,4)", "The line y=x−2 with the point (2,0) removed", "A hyperbola with asymptotes x=2 and y=1"],
    "For x≠2, factorising gives f(x)=(x−2)(x+2)/(x−2)=x+2. But the original definition excludes x=2, so the corresponding point (2,4) is a removable hole.",
    3,
  ),
]
