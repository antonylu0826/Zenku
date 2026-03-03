#!/usr/bin/env bun
import { Command } from "commander";
import { ejectCommand } from "./eject";
import { scaffoldCommand } from "./scaffold";
import { generateCommand } from "./generate";
import { checkCommand } from "./check";
import { devCommand } from "./dev";
import { startCommand } from "./start";
import { cleanupCommand } from "./cleanup";

const program = new Command();

program
  .name("zenku")
  .description("Zenku CLI — entity management, code generation, and dev tools")
  .version("0.0.1");

// P12 commands
program.addCommand(scaffoldCommand);
program.addCommand(generateCommand);
program.addCommand(checkCommand);
program.addCommand(devCommand);
program.addCommand(startCommand);
program.addCommand(cleanupCommand);

// Legacy commands
program.addCommand(ejectCommand);

program.parse();
