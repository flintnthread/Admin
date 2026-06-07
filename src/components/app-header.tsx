import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const BRAND_ORANGE = '#E85D04';
const BRAND_DARK = '#374151';

const DEFAULT_LOGO = require('@/assets/images/flint-thread-logo.png');

type AppHeaderProps = {
  logoSource?: ImageSource;
};

export function AppHeader({ logoSource = DEFAULT_LOGO }: AppHeaderProps) {  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Open menu">
          <MaterialIcons name="menu" size={24} color={BRAND_DARK} />
        </Pressable>

        <View style={styles.brand}>
          <Image
            source={logoSource}
            style={styles.logoImage}
            contentFit="contain"
            accessibilityLabel="Flint and Thread logo"
          />
          
        </View>
      </View>

      <View style={styles.right}>
        <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Toggle theme">
          <MaterialIcons name="dark-mode" size={22} color={BRAND_DARK} />
        </Pressable>

        <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications">
          <MaterialIcons name="notifications-none" size={22} color={BRAND_DARK} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>2</Text>
          </View>
        </Pressable>

        <Pressable style={styles.avatar} accessibilityRole="button" accessibilityLabel="Profile">
          <Text style={styles.avatarText}>FL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  brandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  logoImage: {
    width: 144,
    height: 74,
    flexShrink: 0,
  },
  brandName: {    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandDark: {
    color: BRAND_DARK,
  },
  brandOrange: {
    color: BRAND_ORANGE,
  },
  tagline: {
    marginTop: 1,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#6B7280',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
});
