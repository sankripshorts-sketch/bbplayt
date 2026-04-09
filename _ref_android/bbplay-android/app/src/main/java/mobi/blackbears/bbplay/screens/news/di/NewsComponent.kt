package mobi.blackbears.bbplay.screens.news.di

import dagger.Component
import mobi.blackbears.bbplay.screens.news.fragment.NewsFragment

@NewsScope
@Component(
    modules = [NewsNetworkModule::class, NewsModule::class]
)
interface NewsComponent {
    fun inject(fragment: NewsFragment)

    @Component.Factory
    interface Factory {
        fun create(): NewsComponent
    }
}