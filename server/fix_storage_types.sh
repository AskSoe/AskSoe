#!/bin/bash
sed -i 's/Promise<s>/Promise<System>/g' server/storage.ts.new
sed -i 's/Partial<s>/Partial<System>/g' server/storage.ts.new