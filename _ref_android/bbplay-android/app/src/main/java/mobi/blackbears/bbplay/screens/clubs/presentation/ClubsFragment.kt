package mobi.blackbears.bbplay.screens.clubs.presentation

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentClubsBinding
import mobi.blackbears.bbplay.screens.clubs.di.DaggerClubsComponent
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo
import mobi.blackbears.bbplay.screens.clubs.presentation.adapter.ClubItem
import mobi.blackbears.bbplay.screens.clubs.presentation.adapter.ClubsAdapter
import javax.inject.Inject

class ClubsFragment : BindingFragment<FragmentClubsBinding>(FragmentClubsBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<ClubsViewModel> { factory }
    private val clubsAdapter by lazy {
        ClubsAdapter(
            viewModel::onClickLocation,
            viewModel::onClickOpenPhone,
            viewModel::onClickOpenVkGroup
        )
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerClubsComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        observeIntent()
        initClubsInfo()
        navigateToJobReview()
        observeNavigation()
        observeError()
        setLoader()
    }

    private fun observeIntent() {
        viewModel.intentFlow.observe(viewLifecycleOwner, observer = ::startActivity)
    }

    private fun initClubsInfo() {
        binding.rvClubs.adapter = clubsAdapter
        viewModel.clubsInfo.observe(viewLifecycleOwner, observer = ::createClubItemsAndSetInAdapter)
    }

    private fun createClubItemsAndSetInAdapter(clubs: List<ClubInfo>) {
        val items = clubs.map {
            ClubItem(
                it,
                if (it.clubId == BuildConfig.BBPLAY_ID_CAFE) R.drawable.bg_club_one
                else R.drawable.bg_club_second
            )
        }
        clubsAdapter.submitList(items)
    }

    private fun navigateToJobReview() {
        binding.btJobReview.setBlockingClickListener {
            viewModel.navigateToJobReviewDialog()
        }
    }

    private fun observeNavigation() {
        viewModel.navCommand.observe(viewLifecycleOwner) {
            findNavController().navigate(it.resId, it.args)
        }
    }

    private fun observeError() {
        viewModel.message.observe(viewLifecycleOwner) {
            Toast.makeText(activity, it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }

    private fun setLoader() {
        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.progressBar.root.isVisible = it
        }
    }
}