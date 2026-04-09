package mobi.blackbears.bbplay.screens.news.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.screens.news.data.model.VkNewsResponse
import retrofit2.http.*

private const val COUNT_POSTS = 30

interface VkApi {
    @GET("method/wall.get")
    suspend fun getWallPosts(
        @Query("owner_id") ownerId: Long = BuildConfig.VK_COMMUNITY_ID,
        @Query("count") count: Int = COUNT_POSTS,
        @Query("v") version: Double = BuildConfig.VK_VERSION_API
    ): VkNewsResponse
}