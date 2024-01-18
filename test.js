const str =
  '[2024-01-18 22:53:09] [LOG] Server is Running on http://localhost:4200'

const str1 = str.slice(1, 11).replace(/-/g, '')
console.log(str1)
