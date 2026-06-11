
import { Story, Category } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const categories: Category[] = [
  { id: '1', name: 'Romantik' },
  { id: '2', name: 'Mafya' },
  { id: '3', name: 'Dram' },
  { id: '4', name: 'Fantastik' },
  { id: '5', name: 'Gizem' },
  { id: '6', name: 'Macera' },
];

export const stories: Story[] = [
  {
    id: 's1',
    title: 'Gece Yarısı Güneşi',
    author: 'Elif Şafak',
    synopsis: 'Eski bir konağın tozlu rafları arasında başlayan imkansız bir aşk hikayesi.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'book-1')?.imageUrl || '',
    readCount: 125400,
    category: 'Romantik',
    isPopular: true,
    isFeatured: true,
  },
  {
    id: 's2',
    title: 'Karanlık Lordun Varisi',
    author: 'Zeynep Sahra',
    synopsis: 'Büyülü bir krallığın yıkılışından sonra küllerinden doğan genç bir savaşçının destanı.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'book-2')?.imageUrl || '',
    readCount: 89000,
    category: 'Fantastik',
    isPopular: true,
  },
  {
    id: 's3',
    title: 'Sokakların Kanunu',
    author: 'Ahmet Ümit',
    synopsis: 'Yeraltı dünyasının acımasız kuralları arasında hayatta kalmaya çalışan bir dostluk.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'book-3')?.imageUrl || '',
    readCount: 210000,
    category: 'Mafya',
    isPopular: true,
    isFeatured: true,
  },
  {
    id: 's4',
    title: 'Son Yaprak Dökümü',
    author: 'Reşat Nuri',
    synopsis: 'Parçalanan bir ailenin hüzünlü ve umut dolu yeniden birleşme çabası.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'book-4')?.imageUrl || '',
    readCount: 45000,
    category: 'Dram',
    isPopular: false,
  },
  {
    id: 's5',
    title: 'Mühürlü Kapı',
    author: 'Peyami Safa',
    synopsis: 'İstanbul\'un gizli geçitlerinde saklı kalmış antik bir sırrın peşinde tehlikeli bir takip.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'book-5')?.imageUrl || '',
    readCount: 78000,
    category: 'Gizem',
    isPopular: true,
  },
  {
    id: 's6',
    title: 'Zirve Yolcuları',
    author: 'Sabahattin Ali',
    synopsis: 'Doğanın kalbinde, insanın kendi sınırlarını keşfettiği unutulmaz bir tırmanış macerası.',
    imageUrl: PlaceHolderImages.find(img => img.id === 'book-6')?.imageUrl || '',
    readCount: 32000,
    category: 'Macera',
    isPopular: false,
  }
];
