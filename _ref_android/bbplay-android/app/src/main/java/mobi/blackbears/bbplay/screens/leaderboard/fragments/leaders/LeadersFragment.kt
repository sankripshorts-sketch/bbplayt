package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import coil.api.load
import mobi.blackbears.bbplay.common.extensions.hideOrShowBottomNavigation
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentLeadersBinding
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.adapter.LeadersListAdapter
import kotlinx.coroutines.flow.filter
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.screens.leaderboard.di.DaggerLeaderBoardComponent
import javax.inject.Inject

class LeadersFragment : BindingFragment<FragmentLeadersBinding>(FragmentLeadersBinding::inflate) {
    private val args: LeadersFragmentArgs by navArgs()

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<LeadersViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerLeaderBoardComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requireActivity().hideOrShowBottomNavigation(false)
        setHeaderImage()
        setRecyclerView()
        setNavigation()
        viewModel.getGame(args.gameState)

        viewModel.titleGame.observe(viewLifecycleOwner) {
            binding.tvGameNameRank.text = it
        }
    }

    private fun setHeaderImage() {
        binding.ivGameHeaderLeader.load(args.gameState.imageHeader)
    }

    private fun setRecyclerView() {
        val adapter = LeadersListAdapter()
        binding.rvLeaders.adapter = adapter
        viewModel.rankedItems.observe(viewLifecycleOwner) {
            adapter.submitList(it)
        }

        viewModel.sortingName.filter { it != 0 }.observe(viewLifecycleOwner) {
            binding.optionsRank.tvSortTitle.text = getString(it)
        }
    }

    private fun setNavigation() {
        binding.ivRankNavigateUp.setOnClickListener { findNavController().navigateUp() }
        binding.optionsRank.ivSortingRanks.setBlockingClickListener {
            viewModel.navigateToSorting()
        }

        viewModel.navCommand.observe(viewLifecycleOwner) {
            findNavController().navigate(it.resId, it.args)
        }
    }

    override fun onDestroyView() {
        requireActivity().hideOrShowBottomNavigation(true)
        super.onDestroyView()
    }
}