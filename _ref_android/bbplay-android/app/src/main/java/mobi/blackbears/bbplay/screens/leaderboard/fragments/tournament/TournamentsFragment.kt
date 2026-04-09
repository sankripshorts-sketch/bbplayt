package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentTournamentsBinding
import mobi.blackbears.bbplay.screens.leaderboard.di.DaggerLeaderBoardComponent
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.adapter.GamesListAdapter
import javax.inject.Inject


class TournamentsFragment : BindingFragment<FragmentTournamentsBinding>(FragmentTournamentsBinding::inflate){

    @Inject
    lateinit var factory: ViewModelFactory

    private val viewModel by viewModels<TournamentsViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerLeaderBoardComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setGames()
        setNavigation()
        setLoader()
        setError()
    }

    private fun setGames() {
        val adapter = GamesListAdapter()
        binding.rvGames.adapter = adapter
        viewModel.games.observe(viewLifecycleOwner, observer = adapter::submitList)
    }

    private fun setNavigation() {
        viewModel.navCommand.observe(viewLifecycleOwner) {
            findNavController().navigate(it.resId, it.args)
        }
    }

    private fun setLoader() {
        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.progressBar.root.isVisible = it
        }
    }

    private fun setError() {
        viewModel.errorFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }
}