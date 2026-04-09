package mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentUserBookingsBinding
import mobi.blackbears.bbplay.screens.booking.di.DaggerBookingComponent
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.adapter.UserBookingAdapter
import javax.inject.Inject

class UserBookingsFragment :
    BindingFragment<FragmentUserBookingsBinding>(FragmentUserBookingsBinding::inflate) {
    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<UserBookingsViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerBookingComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setLoading()
        initRecycler()
        binding.btnBackFromUserBookings.setBlockingClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setLoading() {
        viewModel.isLoading.observe(viewLifecycleOwner) {
            binding.pbUserBookings.root.isVisible = it
        }
    }

    private fun initRecycler() {
        val adapter = UserBookingAdapter()
        binding.rvUserBookings.adapter = adapter
        viewModel.userBookings.observe(viewLifecycleOwner, observer = adapter::submitList)
    }
}