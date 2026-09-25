import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items:T[], shift:number) {
  const n=((shift%items.length)+items.length)%items.length
  return [...items.slice(n),...items.slice(0,n)]
}

function mc(id:string,prompt:string,correct:string,distractors:[string,string,string],explanation:string,seed:number):TestQuestion {
  const options=rotate([correct,...distractors],seed%4)
  return { id,test:"UCAT",section:"Quantitative Reasoning",difficulty:seed%3===0?"Stretch":"Challenge",prompt,options,answer:options.indexOf(correct),explanation }
}

const contexts = [
  ["theatre ticket sales","Standard tickets","Student tickets","Premium tickets"],
  ["museum workshop bookings","Morning places","Afternoon places","Evening places"],
  ["regional bus journeys","Route North","Route Central","Route South"],
  ["laboratory supply orders","Glassware packs","Sensor packs","Cable packs"],
  ["charity event entries","Run entries","Cycle entries","Walk entries"],
  ["college café sales","Meal deals","Snack boxes","Drink bundles"],
  ["sports-centre sessions","Swim sessions","Gym sessions","Court sessions"],
  ["book-fair purchases","Fiction bundles","Science bundles","History bundles"],
  ["festival bookings","Day tickets","Weekend tickets","Workshop tickets"],
  ["school trip bookings","Coach places","Rail places","Activity places"],
  ["community energy plans","Plan Alpha","Plan Beta","Plan Gamma"],
  ["printing-service orders","Poster orders","Booklet orders","Card orders"],
] as const

const out:TestQuestion[]=[]

for(let d=0;d<contexts.length;d++) {
  const [context,A,B,C]=contexts[d]
  const a=42+d*3
  const b=31+d*2
  const c=23+d
  const priceA=5+(d%4)
  const priceB=7+(d%3)
  const priceC=6+((d+1)%4)
  const growth=[8,10,12,15][d%4]
  const reduction=[5,10,12,15][(d+1)%4]
  const table=`Data for ${context}\nType | Number | Value per item\n${A} | ${a} | £${priceA}\n${B} | ${b} | £${priceB}\n${C} | ${c} | £${priceC}`

  if(d%4===0) {
    const total=a*priceA+b*priceB
    out.push(mc(`upgrade2-ucat-qr-${d}-0`,`${table}\n\nWhat is the combined value of all ${A.toLowerCase()} and ${B.toLowerCase()}?`,`£${total}`,[`£${a*priceA+b}`,`£${a+b*priceB}`,`£${(a+b)*priceA}`],`${A} contribute ${a}×£${priceA}=£${a*priceA}; ${B} contribute ${b}×£${priceB}=£${b*priceB}; total=£${total}.`,d))

    const pct=(a-c)/c*100
    out.push(mc(`upgrade2-ucat-qr-${d}-1`,`${table}\n\nThe number of ${A.toLowerCase()} exceeds ${C.toLowerCase()} by what percentage of the ${C.toLowerCase()} figure?`,`${pct.toFixed(1)}%`,[`${((a-c)/a*100).toFixed(1)}%`,`${(a/c*100).toFixed(1)}%`,`${(a-c).toFixed(1)}%`],`Difference=${a-c}. Relative to ${C} (${c}), the percentage difference is (${a-c}/${c})×100=${pct.toFixed(1)}%.`,d+17))

    const newB=b*(1+growth/100)
    const newA=a*(1-reduction/100)
    const combined=newA+newB
    out.push(mc(`upgrade2-ucat-qr-${d}-2`,`${table}\n\nIf ${B.toLowerCase()} increase by ${growth}% while ${A.toLowerCase()} fall by ${reduction}%, what is their new combined number?`,combined.toFixed(1),[(a+newB).toFixed(1),(newA+b).toFixed(1),((a+b)*(1+growth/100)).toFixed(1)],`New ${B}=${b}×${(1+growth/100).toFixed(2)}=${newB.toFixed(1)}; new ${A}=${a}×${(1-reduction/100).toFixed(2)}=${newA.toFixed(1)}; combined=${combined.toFixed(1)}.`,d+34))
  } else if(d%4===1) {
    const totalItems=a+b+c
    const totalValue=a*priceA+b*priceB+c*priceC
    const weighted=totalValue/totalItems
    out.push(mc(`upgrade2-ucat-qr-${d}-0`,`${table}\n\nWhat is the mean value per item across all three types, weighted by the number of items?`,`£${weighted.toFixed(2)}`,[`£${((priceA+priceB+priceC)/3).toFixed(2)}`,`£${(totalValue/3).toFixed(2)}`,`£${(totalItems/(priceA+priceB+priceC)).toFixed(2)}`],`Total value=£${totalValue} across ${totalItems} items, so the weighted mean is ${totalValue}/${totalItems}=£${weighted.toFixed(2)} per item.`,d))

    const target=totalItems+25+d
    const shortfall=target-totalItems
    out.push(mc(`upgrade2-ucat-qr-${d}-1`,`${table}\n\nA target of ${target} total items is set. If the figures for all three types stay as shown, how many additional items are needed to reach the target?`,String(shortfall),[String(target-a),String(target-b),String(target-c)],`Current total=${a}+${b}+${c}=${totalItems}. Shortfall=${target}-${totalItems}=${shortfall}.`,d+17))

    const ratio=a/b
    out.push(mc(`upgrade2-ucat-qr-${d}-2`,`${table}\n\nApproximately how many ${A.toLowerCase()} are there for every one ${B.toLowerCase()}?`,`${ratio.toFixed(2)} to 1`,[`${(b/a).toFixed(2)} to 1`,`${((a-b)/b).toFixed(2)} to 1`,`${(a/(b+c)).toFixed(2)} to 1`],`The required ratio is ${A}:${B}=${a}:${b}; dividing both sides by ${b} gives ${ratio.toFixed(2)}:1.`,d+34))
  } else if(d%4===2) {
    const total=a+b+c
    const proportion=a/total*100
    out.push(mc(`upgrade2-ucat-qr-${d}-0`,`${table}\n\nWhat percentage of all items are ${A.toLowerCase()}?`,`${proportion.toFixed(1)}%`,[`${(a/(a+b)*100).toFixed(1)}%`,`${(a/b*100).toFixed(1)}%`,`${((total-a)/total*100).toFixed(1)}%`],`There are ${total} items altogether. ${A} account for ${a}/${total}×100=${proportion.toFixed(1)}%.`,d))

    const raisedPrice=priceB*(1+growth/100)
    const newRevenue=b*raisedPrice
    out.push(mc(`upgrade2-ucat-qr-${d}-1`,`${table}\n\nIf the value per ${B.toLowerCase().replace(/s$/,"")} rises by ${growth}% and the number sold is unchanged, what is the new total value for ${B.toLowerCase()}?`,`£${newRevenue.toFixed(2)}`,[`£${(b*priceB*(growth/100)).toFixed(2)}`,`£${(b*(priceB+growth)).toFixed(2)}`,`£${(b*priceB).toFixed(2)}`],`New unit value=£${priceB}×${(1+growth/100).toFixed(2)}=£${raisedPrice.toFixed(2)}. For ${b} items, total=£${newRevenue.toFixed(2)}.`,d+17))

    const difference=b*priceB-c*priceC
    const correct=`£${Math.abs(difference)}`
    out.push(mc(`upgrade2-ucat-qr-${d}-2`,`${table}\n\nWhat is the absolute difference between the total values of ${B.toLowerCase()} and ${C.toLowerCase()}?`,correct,[`£${Math.abs(b-c)}`,`£${Math.abs(priceB-priceC)}`,`£${Math.abs(b*priceC-c*priceB)}`],`${B} total £${b*priceB}; ${C} total £${c*priceC}; absolute difference=£${Math.abs(difference)}.`,d+34))
  } else {
    const stage1=a*(1+growth/100)
    const stage2=stage1*(1-reduction/100)
    out.push(mc(`upgrade2-ucat-qr-${d}-0`,`${table}\n\nThe number of ${A.toLowerCase()} first rises by ${growth}% and then falls by ${reduction}%. What is the resulting number?`,stage2.toFixed(1),[(a*(1+(growth-reduction)/100)).toFixed(1),(a*(1-reduction/100)).toFixed(1),(a*(1+growth/100)).toFixed(1)],`After the rise: ${a}×${(1+growth/100).toFixed(2)}=${stage1.toFixed(1)}. Then apply the reduction: ${stage1.toFixed(1)}×${(1-reduction/100).toFixed(2)}=${stage2.toFixed(1)}.`,d))

    const valueDiff=a*priceA-c*priceC
    out.push(mc(`upgrade2-ucat-qr-${d}-1`,`${table}\n\nHow much greater is the total value of ${A.toLowerCase()} than the total value of ${C.toLowerCase()}?`,`£${valueDiff}`,[`£${(a-c)*priceA}`,`£${a*(priceA-priceC)}`,`£${a*priceA-c}`],`${A} total £${a*priceA}; ${C} total £${c*priceC}; difference=£${a*priceA}-£${c*priceC}=£${valueDiff}.`,d+17))

    const targetA=b
    const needed=(targetA-c)/c*100
    out.push(mc(`upgrade2-ucat-qr-${d}-2`,`${table}\n\nBy approximately what percentage would ${C.toLowerCase()} need to increase for its number to equal the current ${B.toLowerCase()} figure?`,`${needed.toFixed(1)}%`,[`${((targetA-c)/targetA*100).toFixed(1)}%`,`${(targetA/c*100).toFixed(1)}%`,`${(targetA-c).toFixed(1)}%`],`Increase needed=${targetA-c}. Relative to the current ${C} value ${c}, required percentage=(${targetA-c}/${c})×100=${needed.toFixed(1)}%.`,d+34))
  }
}

export const ucatQrReliabilityUpgradeBank:TestQuestion[]=out
