package mobi.blackbears.bbplay.common.utils

interface Mapper<T, R> {
    fun transform(data: T): R
}