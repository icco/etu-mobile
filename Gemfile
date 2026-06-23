source 'https://rubygems.org'

# You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
ruby ">= 2.6.10"

# Exclude problematic versions of cocoapods and activesupport that cause build failures.
gem 'cocoapods', '>= 1.13', '!= 1.15.0', '!= 1.15.1'
# >= 7.2.3.1 clears GHSA alerts for SafeBuffer#%, number_to_delimited ReDoS,
# and the number-helper DoS (all patched in Rails 7.2.3.1).
gem 'activesupport', '>= 7.2.3.1'
gem 'xcodeproj', '< 1.28.0'
gem 'concurrent-ruby', '< 1.3.8'

# Ruby 3.4.0 has removed some libraries from the standard library.
gem 'bigdecimal'
gem 'logger'
gem 'benchmark'
gem 'mutex_m'
