import type { ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { friendlyError } from './request-error';
import { useTheme } from './theme';
import tokens from './tokens.json';

export function Button({
  label,
  onPress,
  disabled,
  busy,
  quiet,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-tap min-w-tap items-center justify-center rounded-control px-lg py-sm ${quiet ? 'self-start bg-subtle active:bg-surface' : disabled ? 'bg-subtle' : 'bg-brand active:bg-pressed'}`}
    >
      <Text
        className={`text-center text-body font-semibold ${disabled ? 'text-muted' : quiet ? 'text-ink underline' : 'text-on-brand'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Input({ multiline, ...props }: TextInputProps) {
  const { colors, dark } = useTheme();
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.muted}
      cursorColor={colors.brand}
      keyboardAppearance={dark ? 'dark' : 'light'}
      textAlignVertical={multiline ? 'top' : 'center'}
      className={`rounded-control border border-outline bg-surface px-md py-sm text-body text-ink ${multiline ? 'min-h-note' : 'min-h-tap'}`}
    />
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-card border border-outline bg-surface ${className}`}
    >
      {children}
    </View>
  );
}

export function Checkbox({
  children,
  checked,
  label,
  disabled,
  onPress,
}: {
  children: ReactNode;
  checked: boolean;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-row min-w-tap flex-1 flex-row items-center gap-md p-md"
    >
      <View
        className={`h-indicator w-indicator items-center justify-center rounded-indicator border ${checked ? 'border-brand bg-brand' : 'border-outline'}`}
      >
        {checked && (
          <Text className="text-caption font-bold text-on-brand">✓</Text>
        )}
      </View>
      {children}
    </Pressable>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-lg">
      <Text className="text-body text-muted">{message}</Text>
    </Card>
  );
}

export function ErrorState({
  error,
  message,
  retry,
}: {
  error: unknown;
  message: string;
  retry?: { onPress: () => void; refreshing: boolean; hasData: boolean };
}) {
  return (
    <View
      className={`gap-xs rounded-control p-md ${retry ? 'bg-subtle' : 'bg-danger-surface'}`}
    >
      <Text
        accessibilityRole="alert"
        className={`text-caption ${retry ? 'text-muted' : 'text-danger'}`}
      >
        {retry?.hasData ? 'Mostrando a última versão carregada.' : message}{' '}
        {friendlyError(error)}
      </Text>
      {retry && (
        <Button
          label={retry.refreshing ? 'Tentando…' : 'Tentar de novo'}
          onPress={retry.onPress}
          disabled={retry.refreshing}
          busy={retry.refreshing}
          quiet
        />
      )}
    </View>
  );
}

export function ListColor({ color }: { color: string }) {
  return (
    <View
      className="h-indicator w-indicator shrink-0 rounded-pill border border-outline"
      style={{ backgroundColor: color }}
    />
  );
}

export function Palette({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-sm">
      {tokens.listColors.map((color) => {
        const selected = color.value === value.toUpperCase();
        return (
          <Pressable
            key={color.value}
            accessibilityRole="radio"
            accessibilityLabel={color.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(color.value)}
            className="h-tap w-tap items-center justify-center rounded-pill border border-outline"
            style={{ backgroundColor: color.value }}
          >
            {selected && (
              <Text className="text-body font-bold text-on-swatch">✓</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
