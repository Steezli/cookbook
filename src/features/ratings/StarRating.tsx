import React from "react";
import { View, Text, Pressable, StyleSheet, GestureResponderEvent } from "react-native";

type StarRatingProps = {
  value: number;          // 0-5 in 0.5 increments (0 = no rating selected)
  onChange?: (rating: number) => void;  // undefined = readonly mode
  size?: number;          // star size in points, default 32
  showValue?: boolean;    // show numeric value next to stars, default false
};

export function StarRating({ value, onChange, size = 32, showValue = false }: StarRatingProps) {
  const isInteractive = onChange !== undefined;

  const handleStarPress = (starIndex: number, event: GestureResponderEvent) => {
    if (!onChange) return;

    const locationX = event.nativeEvent.locationX;
    const halfWidth = size / 2;
    const isLeftHalf = locationX < halfWidth;

    // starIndex is 0-based (0-4), so we add 1 for whole star or 0.5 for half
    const newRating = starIndex + (isLeftHalf ? 0.5 : 1);
    onChange(newRating);
  };

  const renderStar = (starIndex: number) => {
    const starPosition = starIndex + 1; // Convert to 1-based for comparison

    let filled: 'full' | 'half' | 'empty';
    if (value >= starPosition) {
      filled = 'full';
    } else if (value >= starPosition - 0.5) {
      filled = 'half';
    } else {
      filled = 'empty';
    }

    return (
      <Pressable
        key={starIndex}
        onPress={(event) => handleStarPress(starIndex, event)}
        disabled={!isInteractive}
        style={[
          styles.starContainer,
          { width: 44, height: 44, minWidth: 44, minHeight: 44 }
        ]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={[styles.starWrapper, { width: size, height: size }]}>
          {filled === 'empty' && (
            <Text style={[styles.star, { fontSize: size, color: '#D4D4D4' }]}>
              ☆
            </Text>
          )}
          {filled === 'full' && (
            <Text style={[styles.star, { fontSize: size, color: '#FFD700' }]}>
              ★
            </Text>
          )}
          {filled === 'half' && (
            <View style={styles.halfStarContainer}>
              <Text style={[styles.star, { fontSize: size, color: '#D4D4D4' }]}>
                ☆
              </Text>
              <View style={[styles.halfStarClip, { width: size / 2 }]}>
                <Text style={[styles.star, { fontSize: size, color: '#FFD700' }]}>
                  ★
                </Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {[0, 1, 2, 3, 4].map(renderStar)}
      </View>
      {showValue && (
        <Text style={styles.valueText}>{value.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
  },
  starContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  starWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {},
  halfStarContainer: {
    position: 'relative',
  },
  halfStarClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  valueText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
});
