# Maintainer: glistglistovich228eshkere-afk
pkgname=cppforge
pkgver=1.3.0
pkgrel=1
pkgdesc="A dark, typewriter-style terminal tutor for learning C++"
arch=('any')
url="https://github.com/glistglistovich228eshkere-afk/cppforge"
license=('MIT')
depends=('python')
source=("$pkgname.py")
sha256sums=('SKIP')

package() {
  install -Dm755 "$srcdir/$pkgname.py" "$pkgdir/usr/bin/$pkgname"
}
