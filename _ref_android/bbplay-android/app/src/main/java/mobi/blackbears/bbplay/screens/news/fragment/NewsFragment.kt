package mobi.blackbears.bbplay.screens.news.fragment

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import kotlinx.coroutines.flow.combine
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentNewsBinding
import mobi.blackbears.bbplay.screens.news.di.DaggerNewsComponent
import mobi.blackbears.bbplay.screens.news.fragment.adapter.*
import javax.inject.Inject

class NewsFragment : BindingFragment<FragmentNewsBinding>(FragmentNewsBinding::inflate) {
    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<NewsViewModel> { factory }

    private val linearLayoutManagerWithScrollOff by lazy {
        object : LinearLayoutManager(requireContext()) {
            override fun canScrollVertically(): Boolean = false
        }
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerNewsComponent.create().inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setNewsRecyclerView()
    }

    private fun setNewsRecyclerView() {
        val adapter = NewsListAdapter(viewModel::clickButtonInNews, viewModel::clickButtonLinkInNews)
        binding.root.adapter = adapter

        viewModel.newsFlow
            .combine(viewModel.isCanScroll) { news, isCanScroll -> news to isCanScroll }
            .observe(viewLifecycleOwner, Lifecycle.State.CREATED) { (news, isCanScroll) ->
                setScrollNews(isCanScroll)
                adapter.submitList(news)
            }

        viewModel.intent.observe(viewLifecycleOwner, observer = ::startActivity)
    }

    private fun setScrollNews(isCanScroll: Boolean) {
        binding.root.layoutManager =
            if (isCanScroll)
                LinearLayoutManager(requireContext())
            else
                linearLayoutManagerWithScrollOff
    }
}