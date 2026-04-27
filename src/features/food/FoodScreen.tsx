import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { MainTabParamList } from '../../navigation/types';
import { useThemeColors, fonts, type ColorPalette } from '../../theme';
import { Text } from '../../components/DinText';
import { TabScreenTopBar } from '../../components/TabScreenTopBar';
import { DimmedSheetModal } from '../../components/DimmedSheetModal';
import { DraggableWheelSheet } from '../booking/DraggableWheelSheet';
import { FOOD_CATEGORIES, type FoodCategoryId, type FoodProduct, FOOD_PRODUCTS, getProductById } from './foodCatalog';
import { useFoodCart } from './FoodContext';

const CATEGORY_ALL = 'all' as const;

type CatFilter = typeof CATEGORY_ALL | FoodCategoryId;

type PayResultState = {
  ok: boolean;
  title: string;
  body: string;
  showTopUp?: boolean;
};

type FoodLineStyles = ReturnType<typeof createStyles>;

function QtyWithRemoveRow(props: {
  qty: number;
  onSetQty: (n: number) => void;
  onDec: () => void;
  onInc: () => void;
  onRemove: () => void;
  styles: FoodLineStyles;
  colors: ColorPalette;
  onRemoveA11y: string;
}) {
  const { qty, onSetQty, onDec, onInc, onRemove, styles, colors, onRemoveA11y } = props;
  const [text, setText] = useState(String(qty));
  useEffect(() => {
    setText(String(qty));
  }, [qty]);

  const commit = useCallback(() => {
    const raw = text.trim();
    if (raw === '') {
      onSetQty(1);
      setText('1');
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      onSetQty(1);
      setText('1');
    } else {
      onSetQty(n);
    }
  }, [onSetQty, text]);

  return (
    <View style={styles.qtyControlRow}>
      <Pressable
        style={({ pressed }) => [styles.qtyBtn, pressed && styles.pressed]}
        onPress={onDec}
        accessibilityRole="button"
        accessibilityLabel="−"
      >
        <Text style={styles.qtyBtnText}>−</Text>
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(s) => setText(s.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={3}
        selectTextOnFocus
        style={styles.qtyInput}
        textAlign="center"
      />
      <Pressable
        style={({ pressed }) => [styles.qtyBtn, pressed && styles.pressed]}
        onPress={onInc}
        accessibilityRole="button"
        accessibilityLabel="+"
      >
        <Text style={styles.qtyBtnText}>+</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.qtyRemove, pressed && styles.pressed]}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={onRemoveA11y}
      >
        <MaterialCommunityIcons name="close" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function FoodScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { t, locale } = useLocale();
  const { user, patchUser } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Food'>>();
  const {
    cart,
    cartTotalRub,
    cartItemCount,
    addToCart,
    setCartQty,
    decFromCart,
    clearCart,
    removeFromCart,
  } = useFoodCart();

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CatFilter>(CATEGORY_ALL);
  const [cartOpen, setCartOpen] = useState(false);
  const [lowBalanceOpen, setLowBalanceOpen] = useState(false);
  const [lowBalanceNeed, setLowBalanceNeed] = useState(0);
  const [lowBalanceHave, setLowBalanceHave] = useState('0');
  const [payBusy, setPayBusy] = useState(false);
  const [deliverToPc, setDeliverToPc] = useState(false);
  const [quickBuyProduct, setQuickBuyProduct] = useState<FoodProduct | null>(null);
  const [quickBuyQty, setQuickBuyQty] = useState(1);
  const [payResult, setPayResult] = useState<PayResultState | null>(null);

  const styles = useMemo(
    () => createStyles(colors, 12 + insets.bottom, windowWidth),
    [colors, insets.bottom, windowWidth],
  );

  const goTopUp = useCallback(() => {
    setLowBalanceOpen(false);
    setPayResult(null);
    navigation.navigate('Profile', { screen: 'ProfileHome', params: { openTopUp: true } });
  }, [navigation]);

  const hasBalance = user?.balanceRub !== undefined;
  const balance = user?.balanceRub ?? 0;
  const productName = useCallback(
    (p: FoodProduct) => (locale === 'en' ? p.nameEn : p.nameRu),
    [locale],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOOD_PRODUCTS.filter((p) => {
      if (cat !== CATEGORY_ALL && p.category !== cat) return false;
      if (!q) return true;
      const a = p.nameRu.toLowerCase();
      const b = p.nameEn.toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [query, cat]);

  const runPurchase = useCallback(
    async (amountRub: number, delivery: boolean) => {
      if (!user?.memberId) {
        setPayResult({
          ok: false,
          title: t('food.purchaseFailureTitle'),
          body: t('food.purchaseNotSignedIn'),
        });
        return false;
      }
      const current = user.balanceRub;
      if (current === undefined) {
        setPayResult({
          ok: false,
          title: t('food.purchaseFailureTitle'),
          body: t('food.purchaseNoBalanceData'),
          showTopUp: true,
        });
        return false;
      }
      if (current < amountRub) {
        setLowBalanceNeed(amountRub);
        setLowBalanceHave(current.toFixed(2));
        setLowBalanceOpen(true);
        return false;
      }
      setPayBusy(true);
      try {
        await patchUser({ balanceRub: current - amountRub });
        const base = t('food.purchaseDeducted', { amount: amountRub.toFixed(2) });
        const body = delivery ? `${base}\n\n${t('food.purchaseDeductedDelivery')}` : base;
        setPayResult({
          ok: true,
          title: t('food.purchaseSuccessTitle'),
          body,
        });
        return true;
      } catch {
        setPayResult({
          ok: false,
          title: t('food.purchaseFailureTitle'),
          body: t('food.purchaseError'),
        });
        return false;
      } finally {
        setPayBusy(false);
      }
    },
    [user?.memberId, user?.balanceRub, patchUser, t],
  );

  const openQuickBuy = useCallback((p: FoodProduct) => {
    setCartOpen(false);
    setQuickBuyProduct(p);
    setQuickBuyQty(1);
  }, []);

  const closeQuickBuy = useCallback(() => {
    setQuickBuyProduct(null);
  }, []);

  const onPayCart = useCallback(async () => {
    if (payBusy || cartTotalRub <= 0) return;
    const ok = await runPurchase(cartTotalRub, deliverToPc);
    if (ok) {
      clearCart();
      setCartOpen(false);
    }
  }, [runPurchase, payBusy, cartTotalRub, clearCart, deliverToPc]);

  const onPayQuick = useCallback(async () => {
    if (payBusy || !quickBuyProduct) return;
    const total = quickBuyProduct.priceRub * quickBuyQty;
    if (total <= 0) return;
    const ok = await runPurchase(total, deliverToPc);
    if (ok) {
      setQuickBuyProduct(null);
    }
  }, [runPurchase, payBusy, quickBuyProduct, quickBuyQty, deliverToPc]);

  const onAddCart = useCallback(
    (p: FoodProduct) => {
      addToCart(p.id, 1);
    },
    [addToCart],
  );

  const renderItem = useCallback(
    ({ item: p }: { item: FoodProduct }) => (
      <View style={styles.card}>
        <Image source={p.image} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {productName(p)}
          </Text>
          <Text style={styles.cardPrice}>{p.priceRub} ₽</Text>
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
              onPress={() => onAddCart(p)}
              accessibilityRole="button"
              accessibilityLabel={t('food.addToCart')}
            >
              <MaterialCommunityIcons name="cart-plus" size={22} color={colors.accent} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.pressed,
                payBusy && styles.btnDisabled,
              ]}
              onPress={() => openQuickBuy(p)}
              disabled={payBusy}
            >
              <Text style={styles.btnPrimaryText}>{t('food.buy')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [styles, productName, colors.accent, onAddCart, openQuickBuy, payBusy, t],
  );

  const closeCart = useCallback(() => setCartOpen(false), []);
  const quickBuyOneTotal =
    quickBuyProduct != null ? quickBuyProduct.priceRub * quickBuyQty : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topPad}>
        <TabScreenTopBar
          title={t('tabs.food')}
          horizontalPadding={0}
          rightAccessory={
            <Pressable
              style={({ pressed }) => [styles.cartIconWrap, pressed && styles.pressed]}
              onPress={() => {
                setQuickBuyProduct(null);
                setCartOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('food.cart')}
            >
              <MaterialCommunityIcons name="cart-outline" size={26} color={colors.text} />
              {cartItemCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartItemCount > 99 ? '99+' : String(cartItemCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          }
        />
        {hasBalance ? (
          <View style={styles.balanceBadge}>
            <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.accentBright} />
            <Text style={styles.balanceBadgeLabel}>{t('profile.balance')}</Text>
            <Text style={styles.balanceBadgeValue}>{balance.toFixed(2)} ₽</Text>
          </View>
        ) : (
          <Text style={styles.hintLine}>{t('food.balanceHintLine')}</Text>
        )}

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('food.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          style={styles.chipsScroll}
          showsHorizontalScrollIndicator={windowWidth < 420}
          contentContainerStyle={styles.chipsRow}
          bounces
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              cat === CATEGORY_ALL && styles.chipOn,
              pressed && styles.pressed,
            ]}
            onPress={() => setCat(CATEGORY_ALL)}
          >
            <Text style={[styles.chipText, cat === CATEGORY_ALL && styles.chipTextOn]}>
              {t('food.categoryAll')}
            </Text>
          </Pressable>
          {FOOD_CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                styles.chip,
                cat === c.id && styles.chipOn,
                pressed && styles.pressed,
              ]}
              onPress={() => setCat(c.id)}
            >
              <Text style={[styles.chipText, cat === c.id && styles.chipTextOn]}>
                {locale === 'en' ? c.labelEn : c.labelRu}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row2}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>{t('food.listEmpty')}</Text>}
        keyboardShouldPersistTaps="handled"
      />

      <DimmedSheetModal
        visible={cartOpen}
        onRequestClose={closeCart}
        contentAlign="stretch"
        contentWrapperStyle={styles.cartModalHost}
      >
        {(onSheetDrag) => (
          <KeyboardAvoidingView
            style={styles.cartModalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <DraggableWheelSheet
              open={cartOpen}
              onRequestClose={closeCart}
              onDragOffsetChange={onSheetDrag}
              colors={colors}
              sheetStyle={styles.modalSheet}
              dragExtendBelowGrabberPx={100}
              extendToBottomEdge={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('food.cart')}</Text>
                <Pressable
                  style={({ pressed }) => [styles.headerClose, pressed && styles.pressed]}
                  onPress={closeCart}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.close')}
                >
                  <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.cartScroll} keyboardShouldPersistTaps="handled">
                {Object.keys(cart).length === 0 ? (
                  <Text style={styles.empty}>{t('food.cartEmpty')}</Text>
                ) : null}
                {Object.entries(cart).map(([id, q]) => {
                  const p = getProductById(id);
                  if (!p) return null;
                  return (
                    <View key={id} style={styles.cartLine}>
                      <View style={styles.cartLineTop}>
                        <Text style={styles.cartLineName} numberOfLines={2}>
                          {productName(p)}
                        </Text>
                        <Text style={styles.cartLinePrice}>{(p.priceRub * q).toFixed(0)} ₽</Text>
                      </View>
                      <QtyWithRemoveRow
                        qty={q}
                        onDec={() => decFromCart(id)}
                        onInc={() => addToCart(id, 1)}
                        onSetQty={(n) => setCartQty(id, n)}
                        onRemove={() => removeFromCart(id)}
                        styles={styles}
                        colors={colors}
                        onRemoveA11y={t('food.removeFromCart')}
                      />
                    </View>
                  );
                })}
              </ScrollView>
              {cartItemCount > 0 ? (
                <View style={styles.cartFooter}>
                  <Pressable
                    style={({ pressed }) => [styles.deliveryRow, pressed && styles.pressed]}
                    onPress={() => setDeliverToPc((v) => !v)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: deliverToPc }}
                    accessibilityLabel={t('food.deliveryToPc')}
                  >
                    <View style={[styles.deliveryCheckbox, deliverToPc && styles.deliveryCheckboxOn]}>
                      {deliverToPc ? (
                        <MaterialCommunityIcons name="check" size={14} color={colors.accentTextOnButton} />
                      ) : null}
                    </View>
                    <Text style={styles.deliveryLabel}>{t('food.deliveryToPc')}</Text>
                  </Pressable>
                  <Text style={styles.cartTotal}>
                    {t('food.cartTotal')}: {cartTotalRub.toFixed(0)} ₽
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.checkoutBtn,
                      pressed && styles.pressed,
                      payBusy && styles.btnDisabled,
                    ]}
                    onPress={() => void onPayCart()}
                    disabled={payBusy}
                  >
                    <Text style={styles.checkoutText}>{t('food.cartCheckout')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </DraggableWheelSheet>
          </KeyboardAvoidingView>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={!!quickBuyProduct}
        onRequestClose={closeQuickBuy}
        contentAlign="stretch"
        contentWrapperStyle={styles.cartModalHost}
      >
        {(onSheetDrag) => (
          <KeyboardAvoidingView
            style={styles.cartModalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <DraggableWheelSheet
              open={!!quickBuyProduct}
              onRequestClose={closeQuickBuy}
              onDragOffsetChange={onSheetDrag}
              colors={colors}
              sheetStyle={styles.modalSheet}
              dragExtendBelowGrabberPx={100}
              extendToBottomEdge={false}
            >
              {quickBuyProduct ? (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('food.quickBuyTitle')}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.headerClose, pressed && styles.pressed]}
                      onPress={closeQuickBuy}
                      accessibilityRole="button"
                      accessibilityLabel={t('profile.close')}
                    >
                      <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                    </Pressable>
                  </View>
                  <ScrollView
                    contentContainerStyle={styles.cartScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.cartLine}>
                      <View style={styles.cartLineTop}>
                        <Text style={styles.cartLineName} numberOfLines={2}>
                          {productName(quickBuyProduct)}
                        </Text>
                        <Text style={styles.cartLinePrice}>
                          {quickBuyOneTotal.toFixed(0)} ₽
                        </Text>
                      </View>
                      <QtyWithRemoveRow
                        qty={quickBuyQty}
                        onDec={() => setQuickBuyQty((n) => Math.max(1, n - 1))}
                        onInc={() => setQuickBuyQty((n) => Math.min(999, n + 1))}
                        onSetQty={(n) => setQuickBuyQty(n)}
                        onRemove={closeQuickBuy}
                        styles={styles}
                        colors={colors}
                        onRemoveA11y={t('profile.close')}
                      />
                    </View>
                  </ScrollView>
                  <View style={styles.cartFooter}>
                    <Pressable
                      style={({ pressed }) => [styles.deliveryRow, pressed && styles.pressed]}
                      onPress={() => setDeliverToPc((v) => !v)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: deliverToPc }}
                      accessibilityLabel={t('food.deliveryToPc')}
                    >
                      <View style={[styles.deliveryCheckbox, deliverToPc && styles.deliveryCheckboxOn]}>
                        {deliverToPc ? (
                          <MaterialCommunityIcons name="check" size={14} color={colors.accentTextOnButton} />
                        ) : null}
                      </View>
                      <Text style={styles.deliveryLabel}>{t('food.deliveryToPc')}</Text>
                    </Pressable>
                    <Text style={styles.cartTotal}>
                      {t('food.cartTotal')}: {quickBuyOneTotal.toFixed(0)} ₽
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.checkoutBtn,
                        pressed && styles.pressed,
                        payBusy && styles.btnDisabled,
                      ]}
                      onPress={() => void onPayQuick()}
                      disabled={payBusy}
                    >
                      <Text style={styles.checkoutText}>{t('food.cartCheckout')}</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </DraggableWheelSheet>
          </KeyboardAvoidingView>
        )}
      </DimmedSheetModal>

      <Modal
        visible={!!payResult}
        animationType="fade"
        transparent
        onRequestClose={() => setPayResult(null)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.payResultOverlay}>
          <View style={styles.payResultCard}>
            <Text style={styles.payResultTitle}>{payResult?.title}</Text>
            <Text style={styles.payResultBody}>{payResult?.body}</Text>
            {payResult?.showTopUp ? (
              <Pressable
                style={({ pressed }) => [styles.checkoutBtn, pressed && styles.pressed, { marginTop: 16 }]}
                onPress={goTopUp}
              >
                <Text style={styles.checkoutText}>{t('food.goTopUp')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                payResult?.ok ? styles.payResultOkBtn : styles.payResultCloseBtn,
                pressed && styles.pressed,
                { marginTop: payResult?.showTopUp ? 10 : 20 },
              ]}
              onPress={() => setPayResult(null)}
            >
              <Text style={payResult?.ok ? styles.payResultOkBtnText : styles.payResultCloseBtnText}>
                {t('verify.alertOk')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={lowBalanceOpen}
        animationType="fade"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.warnCard}>
            <Text style={styles.warnTitle}>{t('food.insufficientTitle')}</Text>
            <Text style={styles.warnBody}>
              {t('food.insufficientBody', { need: lowBalanceNeed.toFixed(0), have: lowBalanceHave })}
            </Text>
            <View style={styles.warnBtns}>
              <Pressable style={({ pressed }) => [styles.checkoutBtn, pressed && styles.pressed]} onPress={goTopUp}>
                <Text style={styles.checkoutText}>{t('food.goTopUp')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnGhostWide, pressed && styles.pressed]}
                onPress={() => setLowBalanceOpen(false)}
              >
                <Text style={styles.btnGhostText}>{t('profile.close')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette, listPadBottom: number, windowWidth: number) {
  const narrow = windowWidth < 360;
  const mid = windowWidth < 400;
  const chipFont = narrow ? 11 : 12;
  const chipPadH = narrow ? 7 : mid ? 8 : 9;
  const chipPadV = narrow ? 3 : 4;
  const chipGap = narrow ? 5 : 6;
  const chipRadius = narrow ? 10 : 12;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
    topPad: { paddingTop: 4 },
    balanceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 8,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    balanceBadgeLabel: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.muted,
    },
    balanceBadgeValue: {
      fontSize: 14,
      fontFamily: fonts.semibold,
      color: colors.text,
    },
    hintLine: { fontSize: 13, color: colors.muted, marginBottom: 6 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 16,
      fontFamily: fonts.regular,
      color: colors.text,
      marginBottom: 10,
    },
    chipsScroll: { marginHorizontal: -2, maxWidth: '100%' as const },
    chipsRow: {
      gap: chipGap,
      paddingBottom: 8,
      paddingRight: 4,
      paddingLeft: 2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    deliveryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      paddingVertical: 2,
    },
    deliveryCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    deliveryCheckboxOn: {
      backgroundColor: colors.accent,
    },
    deliveryLabel: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: colors.text },
    chip: {
      paddingHorizontal: chipPadH,
      paddingVertical: chipPadV,
      borderRadius: chipRadius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: chipFont, fontFamily: fonts.medium, color: colors.text },
    chipTextOn: { color: colors.accentTextOnButton },
    listContent: { paddingBottom: listPadBottom, gap: 0 },
    row2: { gap: 10, marginBottom: 10, justifyContent: 'space-between' },
    card: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardImage: { width: '100%', height: 110, backgroundColor: colors.border },
    cardBody: { padding: 8 },
    cardTitle: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text, minHeight: 36 },
    cardPrice: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text, marginTop: 4 },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
      justifyContent: 'space-between',
    },
    btnGhost: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    btnPrimaryText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.accentTextOnButton },
    btnDisabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
    empty: { textAlign: 'center', color: colors.muted, marginTop: 32, fontFamily: fonts.regular },
    cartIconWrap: { position: 'relative', padding: 2 },
    badge: {
      position: 'absolute',
      right: -4,
      top: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: { fontSize: 10, fontFamily: fonts.semibold, color: colors.accentTextOnButton },
    cartModalHost: { flex: 1, justifyContent: 'flex-end' },
    cartModalKeyboard: { flex: 1, width: '100%', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '78%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
    },
    headerClose: { padding: 6, marginRight: -6 },
    modalTitle: { fontSize: 22, fontFamily: fonts.semibold, color: colors.text, flex: 1 },
    cartScroll: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4, gap: 0 },
    cartLine: {
      paddingVertical: 12,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cartLineTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
    cartLineName: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.regular },
    cartLinePrice: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
    qtyControlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    qtyBtn: {
      minWidth: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBtnText: { fontSize: 20, color: colors.text, fontFamily: fonts.semibold, lineHeight: 22 },
    qtyInput: {
      flex: 1,
      minWidth: 56,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      fontSize: 16,
      fontFamily: fonts.semibold,
      color: colors.text,
      paddingVertical: 0,
      paddingHorizontal: 6,
    },
    qtyRemove: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    cartFooter: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 6 },
    cartTotal: { fontSize: 18, fontFamily: fonts.semibold, color: colors.text, marginTop: 2 },
    checkoutBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    checkoutText: { fontSize: 17, fontFamily: fonts.semibold, color: colors.accentTextOnButton },
    payResultOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      padding: 24,
    },
    payResultCard: { alignItems: 'stretch', maxWidth: 420, alignSelf: 'center', width: '100%' },
    payResultTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 34,
      fontFamily: fonts.semibold,
    },
    payResultBody: {
      color: colors.muted,
      fontSize: 17,
      textAlign: 'center',
      marginTop: 20,
      lineHeight: 26,
      fontFamily: fonts.regular,
    },
    payResultOkBtn: {
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    payResultOkBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 18, fontFamily: fonts.semibold },
    payResultCloseBtn: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    payResultCloseBtnText: { color: colors.text, fontWeight: '700', fontSize: 18, fontFamily: fonts.semibold },
    modalBackdropCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    warnCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
    warnTitle: { fontSize: 18, fontFamily: fonts.semibold, color: colors.text, marginBottom: 8 },
    warnBody: { fontSize: 15, lineHeight: 22, color: colors.text, fontFamily: fonts.regular, marginBottom: 16 },
    warnBtns: { gap: 10 },
    btnGhostWide: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnGhostText: { fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  });
}
