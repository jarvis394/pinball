const formatWordByNumber = (
  num: number,
  t: string,
  ta: string,
  tov: string
) => {
  num = num % 100
  if (num % 10 === 1 && (num < 10 || num > 20)) return t
  else if (num % 10 >= 2 && num % 10 <= 4 && (num < 10 || num > 20)) return ta
  else return tov
}

export default formatWordByNumber
