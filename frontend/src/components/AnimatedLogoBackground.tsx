import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Easing } from 'react-native';

// Mix of Turkish clubs + World Cup national teams for variety
const LOGOS_LEFT = [
  'https://media.api-sports.io/football/teams/645.png', // Galatasaray
  'https://flagcdn.com/w80/br.png', // Brazil
  'https://media.api-sports.io/football/teams/611.png', // Fenerbahçe
  'https://flagcdn.com/w80/ar.png', // Argentina
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Besiktas_JK.svg/500px-Besiktas_JK.svg.png', // Beşiktaş
  'https://flagcdn.com/w80/fr.png', // France
  'https://media.api-sports.io/football/teams/646.png', // Trabzonspor
  'https://flagcdn.com/w80/de.png', // Germany
  'https://media.api-sports.io/football/teams/644.png', // Başakşehir
  'https://flagcdn.com/w80/es.png', // Spain
  'https://media.api-sports.io/football/teams/3568.png', // Antalyaspor
  'https://flagcdn.com/w80/pt.png', // Portugal
  'https://media.api-sports.io/football/teams/3569.png', // Sivasspor
  'https://flagcdn.com/w80/nl.png', // Netherlands
  'https://media.api-sports.io/football/teams/3570.png', // Konyaspor
  'https://flagcdn.com/w80/it.png', // Italy
  'https://media.api-sports.io/football/teams/3571.png', // Kasımpaşa
  'https://flagcdn.com/w80/tr.png', // Turkey
  'https://media.api-sports.io/football/teams/3575.png', // Göztepe
  'https://flagcdn.com/w80/gb-eng.png', // England
];

const LOGOS_RIGHT = [
  'https://flagcdn.com/w80/tr.png', // Turkey
  'https://media.api-sports.io/football/teams/3576.png', // Samsunspor
  'https://flagcdn.com/w80/jp.png', // Japan
  'https://media.api-sports.io/football/teams/3577.png', // Gaziantep FK
  'https://flagcdn.com/w80/kr.png', // South Korea
  'https://media.api-sports.io/football/teams/3578.png', // Hatayspor
  'https://flagcdn.com/w80/mx.png', // Mexico
  'https://media.api-sports.io/football/teams/3579.png', // Pendikspor
  'https://flagcdn.com/w80/us.png', // USA
  'https://media.api-sports.io/football/teams/3580.png', // İstanbulspor
  'https://flagcdn.com/w80/sn.png', // Senegal
  'https://media.api-sports.io/football/teams/3581.png', // Bodrum FK
  'https://flagcdn.com/w80/hr.png', // Croatia
  'https://media.api-sports.io/football/teams/3582.png', // Eyüpspor
  'https://flagcdn.com/w80/ma.png', // Morocco
  'https://media.api-sports.io/football/teams/3572.png', // Alanyaspor
  'https://flagcdn.com/w80/ca.png', // Canada
  'https://media.api-sports.io/football/teams/3573.png', // Kayserispor
  'https://flagcdn.com/w80/uy.png', // Uruguay
  'https://media.api-sports.io/football/teams/3574.png', // Rizespor
];

const ITEM_SIZE = 70;
const TOTAL_HEIGHT = 20 * ITEM_SIZE;

export default function AnimatedLogoBackground() {
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(-TOTAL_HEIGHT)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(leftAnim, {
        toValue: -TOTAL_HEIGHT,
        duration: 35000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(rightAnim, {
        toValue: 0,
        duration: 40000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const renderColumn = (logos: string[], animValue: Animated.Value) => (
    <Animated.View style={[styles.column, { transform: [{ translateY: animValue }] }]}>
      {[...logos, ...logos, ...logos].map((uri, i) => (
        <View key={i} style={styles.logoWrapper}>
          <Image source={{ uri }} style={styles.logo} resizeMode="contain" />
        </View>
      ))}
    </Animated.View>
  );

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.leftCol}>
        {renderColumn(LOGOS_LEFT, leftAnim)}
      </View>
      <View style={styles.rightCol}>
        {renderColumn(LOGOS_RIGHT, rightAnim)}
      </View>
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#050510',
    zIndex: -1,
  },
  leftCol: { width: 80, opacity: 0.55 },
  rightCol: { width: 80, opacity: 0.55 },
  column: { width: '100%', alignItems: 'center' },
  logoWrapper: { width: ITEM_SIZE, height: ITEM_SIZE, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 48, height: 48, opacity: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,16,0.35)', 
  }
});
