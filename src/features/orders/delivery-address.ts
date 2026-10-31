
/** Ko'cha matnida shu qism allaqachon bormi — ko'rsatishda takrorlanmasin. */
export function containsPart(text: string, part: string): boolean {
  return text.toLocaleLowerCase("uz").includes(part.toLocaleLowerCase("uz"));
}
