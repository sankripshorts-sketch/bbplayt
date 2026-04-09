package mobi.blackbears.bbplay.screens.profile.fragments

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.BottomFragmentConfirmUserEmailBinding
import mobi.blackbears.bbplay.screens.profile.di.DaggerProfileComponent
import javax.inject.Inject

class ConfirmUserEmailFragment : BindingFragment<BottomFragmentConfirmUserEmailBinding>(
    BottomFragmentConfirmUserEmailBinding::inflate
) {

    @Inject
    lateinit var factory: ViewModelFactory

    private val viewModel by viewModels<ConfirmUserEmailViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerProfileComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setNavigation()
        setupUi()
    }

    private fun setNavigation() {
        viewModel.navCommand.observe(
            viewLifecycleOwner,
            Lifecycle.State.CREATED,
            observer = findNavController()::safeNavigate
        )
        with(binding) {
            nextButton.setBlockingClickListener {
                viewModel.getEmail(etEmail.getText())
                viewModel.navigateToPay()
            }

            arrowBackImage.setBlockingClickListener {
                findNavController().navigateUp()
            }
        }
    }

    private fun setupUi() {
        with(binding) {
            etEmail.addTextIsNotEmptyListener(viewModel::setEmailIsNotEmpty)
            viewModel.isButtonEnabled.observe(viewLifecycleOwner) { enabled ->
                nextButton.isEnabled = enabled
            }
        }
    }
}