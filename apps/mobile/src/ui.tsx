import { Pressable, Text, View } from 'react-native';

const colors = [
  { label: 'Branco', value: '#FFFFFF' },
  { label: 'Amarelo', value: '#FDE68A' },
  { label: 'Rosa', value: '#FBCFE8' },
  { label: 'Verde', value: '#BBF7D0' },
  { label: 'Azul', value: '#BFDBFE' },
  { label: 'Lilás', value: '#DDD6FE' },
];

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
    <View className="flex-row flex-wrap gap-2">
      {colors.map((color) => {
        const selected = color.value === value.toUpperCase();
        return (
          <Pressable
            key={color.value}
            accessibilityRole="radio"
            accessibilityLabel={color.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(color.value)}
            className="h-11 w-11 items-center justify-center rounded-full border border-stone-400"
            style={{ backgroundColor: color.value }}
          >
            {selected && <Text className="font-bold text-stone-900">✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="min-h-11 items-center justify-center rounded-xl bg-stone-900 px-4 disabled:opacity-50"
    >
      <Text className="font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

export function ErrorMessage({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <View className="gap-2 rounded-xl bg-red-50 p-3">
      <Text accessibilityRole="alert" className="text-red-800">
        {error.message === 'Network request failed'
          ? 'Não foi possível conectar à API. Confira a rede e o endereço configurado.'
          : error.message}
      </Text>
      {retry && <Button label="Tentar novamente" onPress={retry} />}
    </View>
  );
}
