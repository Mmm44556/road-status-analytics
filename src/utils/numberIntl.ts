export default function numberIntl(number: number | string) {
  const num = Number(number);

  if (typeof num === "number" && number !== "" && !isNaN(num)) {
    return new Intl.NumberFormat().format(num);
  } else {
    return number;
  }
}
