/**
 * パスワードリセット成功時に /login へ渡すクエリのキーと値。
 * reset-password ページ（付与側）と login ページ（読取側）で共有し、マジック文字列の二重定義を防ぐ。
 */
export const RESET_SUCCESS_QUERY_KEY = 'reset'
export const RESET_SUCCESS_QUERY_VALUE = 'success'
