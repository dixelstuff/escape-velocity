/** Display scale only; it never changes launch or arrival scores. */
export function mapFraction(similarity, baseline, arrival) {
  if(arrival<=baseline+1e-7)return (similarity-baseline)/Math.max(1e-6,1-baseline);
  if(similarity<=arrival)return .9*(similarity-baseline)/(arrival-baseline);
  return .9+.1*(similarity-arrival)/Math.max(1e-6,1-arrival);
}
