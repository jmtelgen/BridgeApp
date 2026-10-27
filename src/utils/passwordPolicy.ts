export const PASSWORD_HINT = 'Use 8–128 characters with a lowercase letter, an uppercase letter, a digit, and a symbol: !@#$%^&*()_+-=[]{}|;:,.<>?'

export function validatePassword(password: string): string | null {
  const characters = Array.from(password)
  if (characters.length < 8) return 'Password must be at least 8 characters long'
  if (characters.length > 128) return 'Password must be no more than 128 characters long'
  if (!/\p{Ll}/u.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/\p{Lu}/u.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/\p{Nd}/u.test(password)) return 'Password must contain at least one digit'
  if (!characters.some(c => '!@#$%^&*()_+-=[]{}|;:,.<>?'.includes(c)))
    return 'Password must contain at least one special character'
  return null
}
