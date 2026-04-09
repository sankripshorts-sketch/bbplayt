package mobi.blackbears.bbplay.screens.login.fragments.confirmnumber

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.hideOrShowBottomNavigation
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentPhoneNumberConfirmationBinding
import mobi.blackbears.bbplay.screens.login.di.DaggerLoginComponent
import javax.inject.Inject

class PhoneNumberConfirmationFragment :
    BindingFragment<FragmentPhoneNumberConfirmationBinding>(FragmentPhoneNumberConfirmationBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<PhoneNumberConfirmationViewModel> { factory }

    private var shouldShowBottomNavigationAfterDestroy = true

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerLoginComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        requireActivity().hideOrShowBottomNavigation(false)

        setPhoneNumber()
        setListeners()
        setNavigation()
        setErrorFlow()
    }

    private fun setPhoneNumber() {
        binding.etPhone.setText(viewModel.phoneNumber)
    }

    private fun setListeners() {
        with(binding) {
            etPhone.addTextIsNotEmptyListener(viewModel::setPhoneIsNotEmpty)

            btBackNavigate.setOnClickListener { findNavController().navigateUp() }

            viewModel.isButtonEnabled.observe(viewLifecycleOwner) {
                btNext.isEnabled = it
            }
            btNext.setBlockingClickListener {
                viewModel.continueConfirmation(etPhone.getText())
            }
        }
    }

    private fun setNavigation() {
        viewModel.navCommand.observe(viewLifecycleOwner) {
            shouldShowBottomNavigationAfterDestroy = false
            findNavController().safeNavigate(it)
        }
    }

    private fun setErrorFlow() {
        viewModel.errorFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        requireActivity().hideOrShowBottomNavigation(shouldShowBottomNavigationAfterDestroy)
        shouldShowBottomNavigationAfterDestroy = true
        super.onDestroyView()
    }
}