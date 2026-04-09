package mobi.blackbears.bbplay.screens.profile.fragments

import android.content.Context
import android.os.Bundle
import android.view.View
import android.view.animation.Animation
import android.view.animation.AnimationUtils
import android.widget.Toast
import androidx.core.view.isInvisible
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.hideOrShowBottomNavigation
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentProfileBinding
import mobi.blackbears.bbplay.screens.profile.di.DaggerProfileComponent
import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo
import javax.inject.Inject


class ProfileFragment : BindingFragment<FragmentProfileBinding>(FragmentProfileBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory

    private val viewModel by viewModels<ProfileViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerProfileComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        /*Если мы заходим с экрана login - там стоит focus true, у нас там скрыт navigation bottom
        * и соответсвенно его надо восстановить. Для этого обращаемся к активити и показываем
        * bottomNavigation*/
        requireActivity().hideOrShowBottomNavigation(true)

        setLoader()
        setBonusBanner()
        observeSettingsInfo()
        setNavigation()
        setSwipeRefreshListener()
        setError()
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadProfileInfo()
    }

    private fun setLoader() {
        val animation: Animation = AnimationUtils.loadAnimation(this.context, R.anim.alpha)
        setUpAnimation(animation = animation)

        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.payButton.isEnabled = !it
            binding.gridLayout.tableOfLeaders.isEnabled = !it
            makeLoadingVisibility(isVisible = it)
        }
    }

    private fun setBonusBanner() {
        viewModel.isBonusBannerVisible.observe(viewLifecycleOwner) { visible ->
            binding.bonusInfoBanner.root.isVisible = visible
        }
    }

    private fun makeLoadingVisibility(isVisible: Boolean) {
        with(binding) {
            tfHello.isInvisible = isVisible
            gridLayoutLoading.root.isVisible = isVisible
            loadingButton.root.isVisible = isVisible
            profileLoadingBalance.root.isVisible = isVisible
            loadingText.root.isVisible = isVisible
        }
    }

    private fun setUpAnimation(animation: Animation) {
        with(binding.profileLoadingBalance) {
            profileLoading1.startAnimation(animation)
            profileLoading2.startAnimation(animation)
            profileLoading3.startAnimation(animation)
            profileLoading4.startAnimation(animation)
            profileLoading5.startAnimation(animation)
        }

        with(binding.gridLayoutLoading) {
            profileLoading6.startAnimation(animation)
            profileLoading7.startAnimation(animation)
            profileLoading8.startAnimation(animation)
            profileLoading9.startAnimation(animation)
            profileLoading10.startAnimation(animation)
            profileLoading11.startAnimation(animation)
        }

        with(binding) {
            loadingButton.cups1.startAnimation(animation)
            loadingText.profileLoadingText1.startAnimation(animation)
            loadingText.profileLoadingText2.startAnimation(animation)
        }
    }

    private fun observeSettingsInfo() {
        viewModel.profileInfo.observe(viewLifecycleOwner, observer = ::setUpInfo)
    }

    private fun setUpInfo(it: ProfileInfo) {
        with(binding) {
            gridLayout.etCups.text = it.memberCups
            profileBalance.etBalance.text = getString(R.string.price_text, it.memberBalance)
            profileBalance.etBonusBalance.text = it.memberBonusBalance
            tfHello.text = getString(R.string.show_hi, it.memberAccount)
        }
    }

    private fun setNavigation() {
        with(binding) {
            btSettings.setBlockingClickListener {
                viewModel.navigateToSettings()
            }
            gridLayout.tableOfLeaders.setBlockingClickListener {
                viewModel.navigateToLeaderBoard()
            }
            payButton.setBlockingClickListener {
                viewModel.navigateToPay()
            }
            profileBalance.bonus1.setOnClickListener {
                viewModel.navigateToBonusDialog()
            }
        }

        viewModel.navCommand.observe(
            viewLifecycleOwner,
            Lifecycle.State.CREATED,
            observer = findNavController()::safeNavigate
        )
    }

    private fun setSwipeRefreshListener() {
        binding.root.setOnRefreshListener {
            viewModel.loadProfileInfo()
            binding.root.isRefreshing = false
        }
    }

    private fun setError() {
        viewModel.messageFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }
}
