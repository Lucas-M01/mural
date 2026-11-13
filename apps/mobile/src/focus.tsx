import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const destinations = [
  { href: '/', icon: '⌂', label: 'Painel' },
  { href: '/lists', icon: '☷', label: 'Listas' },
  { href: '/profile', icon: '◎', label: 'Perfil' },
] as const;

type Destination = (typeof destinations)[number]['href'];

export function FocusScreen({
  active,
  children,
  action,
}: {
  active: Destination;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="min-h-row flex-row items-center justify-between px-xl">
        <Text className="text-heading font-bold text-ink">Mural</Text>
        {action}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="gap-xl px-xl pb-xl pt-lg">{children}</View>
      </ScrollView>
      <View className="flex-row rounded-t-card border-t border-outline bg-surface px-sm">
        {destinations.map(({ href, icon, label }) => (
          <Link key={href} href={href} replace asChild>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: href === active }}
              className="min-h-row flex-1 items-center justify-center"
            >
              <Text
                className={href === active ? 'text-brand-ink' : 'text-muted'}
              >
                <Text className="text-heading">{icon}</Text>
              </Text>
              <Text
                className={href === active ? 'text-brand-ink' : 'text-muted'}
              >
                {label}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      accessibilityRole="header"
      className="text-eyebrow font-bold uppercase tracking-widest text-muted"
    >
      {children}
    </Text>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      className="h-sm overflow-hidden rounded-pill bg-subtle"
    >
      <View
        className="h-full rounded-pill bg-brand"
        style={{ width: `${value}%` }}
      />
    </View>
  );
}
