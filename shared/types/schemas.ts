import { z } from 'zod'

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, '現在のパスワードを入力してください'),
    next: z.string().min(8, '新しいパスワードは8文字以上で入力してください'),
    confirm: z.string().min(1, '新しいパスワード（確認）を入力してください')
  })
  .refine(data => data.next === data.confirm, {
    message: '新しいパスワードが一致しません',
    path: ['confirm']
  })

export const updatePasswordBodySchema = z.object({
  password: z.string().min(8, '新しいパスワードは8文字以上で入力してください')
})

export type PasswordChangeSchema = z.output<typeof passwordChangeSchema>
export type UpdatePasswordBody = z.output<typeof updatePasswordBodySchema>
